import { BadRequestException, Injectable } from '@nestjs/common';
import type { Domain, Site } from '@prisma/client';
import type { AuthUser } from '../auth/auth.types';
import { CAPABILITY_KEYS } from '../capability/capability.constants';
import { CapabilityService } from '../capability/capability.service';
import { PrismaService } from '../database/prisma.service';
import type { BindDomainDto } from './dto/bind-domain.dto';
import type { CreateMySiteDto } from './dto/create-my-site.dto';
import type { CreateSiteDto } from './dto/create-site.dto';
import type { UpdateMySiteDto } from './dto/update-my-site.dto';
import type { UpdateSiteDto } from './dto/update-site.dto';

@Injectable()
export class SiteService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly capabilityService: CapabilityService,
  ) {}

  async createSite(input: CreateSiteDto) {
    const site = await this.prisma.$transaction(async (tx) => {
      const createdSite = await tx.site.create({
        data: {
          ownerUserId: BigInt(input.ownerUserId),
          name: input.name,
          status: 'active',
        },
      });

      if (input.systemSubdomain) {
        await tx.domain.create({
          data: {
            siteId: createdSite.id,
            domain: input.systemSubdomain.toLowerCase(),
            type: 'system_sub',
            status: 'active',
            isPrimary: true,
          },
        });
      }

      return tx.site.findUniqueOrThrow({
        where: {
          id: createdSite.id,
        },
        include: {
          domains: true,
        },
      });
    });

    return this.mapSite(site);
  }

  async listSites() {
    const sites = await this.prisma.site.findMany({
      orderBy: {
        id: 'desc',
      },
      include: {
        domains: true,
      },
    });

    return sites.map((site) => this.mapSite(site));
  }

  async listSitesByOwner(ownerUserId: string) {
    const sites = await this.prisma.site.findMany({
      where: {
        ownerUserId: BigInt(ownerUserId),
      },
      orderBy: {
        id: 'desc',
      },
      include: {
        domains: true,
      },
    });

    return sites.map((site) => this.mapSite(site));
  }

  async createSiteForOwner(user: AuthUser, input: CreateMySiteDto) {
    this.assertAgentUser(user);

    const siteCapability = await this.capabilityService.checkLevelCapability(
      user.levelCode,
      CAPABILITY_KEYS.siteCreate,
    );

    if (!siteCapability.allowed) {
      throw new BadRequestException('Current level cannot create storefronts.');
    }

    const currentSiteCount = await this.prisma.site.count({
      where: {
        ownerUserId: BigInt(user.id),
      },
    });

    if (
      siteCapability.limitValue !== undefined &&
      currentSiteCount >= siteCapability.limitValue
    ) {
      throw new BadRequestException('Storefront limit reached for current level.');
    }

    if (input.systemSubdomain) {
      await this.assertDomainCapability(user, 'system_sub');
    }

    return this.createSite({
      ownerUserId: user.id,
      name: input.name,
      systemSubdomain: input.systemSubdomain,
    });
  }

  async updateOwnedSite(
    ownerUserId: string,
    siteId: string,
    input: UpdateMySiteDto,
  ) {
    await this.assertSiteOwner(ownerUserId, siteId);

    const site = await this.prisma.site.update({
      where: {
        id: BigInt(siteId),
      },
      data: {
        name: input.name,
        logo: input.logo,
        seoTitle: input.seoTitle,
        seoKeywords: input.seoKeywords,
        seoDescription: input.seoDescription,
        notice: input.notice,
      },
      include: {
        domains: true,
      },
    });

    return this.mapSite(site);
  }

  async updateSite(id: string, input: UpdateSiteDto) {
    const site = await this.prisma.site.update({
      where: {
        id: BigInt(id),
      },
      data: {
        name: input.name,
        logo: input.logo,
        status: input.status,
        seoTitle: input.seoTitle,
        seoKeywords: input.seoKeywords,
        seoDescription: input.seoDescription,
        notice: input.notice,
      },
      include: {
        domains: true,
      },
    });

    return this.mapSite(site);
  }

  async bindDomain(input: BindDomainDto) {
    const domain = await this.prisma.domain.create({
      data: {
        siteId: BigInt(input.siteId),
        domain: input.domain.toLowerCase(),
        type: input.type,
        status: input.type === 'system_sub' ? 'active' : 'pending',
      },
    });

    return this.mapDomain(domain);
  }

  async bindOwnedDomain(user: AuthUser, input: BindDomainDto) {
    this.assertAgentUser(user);
    await this.assertSiteOwner(user.id, input.siteId);
    await this.assertDomainCapability(user, input.type);
    await this.assertDomainLimit(user, input.siteId);

    return this.bindDomain(input);
  }

  async resolveByHost(host: string) {
    const normalizedHost = host.split(':')[0]?.toLowerCase();

    if (!normalizedHost) {
      throw new BadRequestException('Host is required.');
    }

    const domain = await this.prisma.domain.findUnique({
      where: {
        domain: normalizedHost,
      },
      include: {
        site: {
          include: {
            domains: true,
          },
        },
      },
    });

    if (!domain || domain.status !== 'active' || !domain.site) {
      throw new BadRequestException('Site not found for host.');
    }

    if (domain.site.status !== 'active') {
      throw new BadRequestException('Site is not active.');
    }

    return {
      host: normalizedHost,
      domain: this.mapDomain(domain),
      site: this.mapSite(domain.site),
    };
  }

  async resolveSiteEntityByHost(host: string) {
    const normalizedHost = host.split(':')[0]?.toLowerCase();

    if (!normalizedHost) {
      throw new BadRequestException('Host is required.');
    }

    const domain = await this.prisma.domain.findUnique({
      where: {
        domain: normalizedHost,
      },
      include: {
        site: true,
      },
    });

    if (!domain || domain.status !== 'active' || !domain.site) {
      throw new BadRequestException('Site not found for host.');
    }

    if (domain.site.status !== 'active') {
      throw new BadRequestException('Site is not active.');
    }

    return {
      host: normalizedHost,
      domain,
      site: domain.site,
    };
  }

  private assertAgentUser(user: AuthUser) {
    if (user.role !== 'agent') {
      throw new BadRequestException('Only agent users can manage storefronts.');
    }
  }

  private async assertSiteOwner(ownerUserId: string, siteId: string) {
    const site = await this.prisma.site.findFirst({
      where: {
        id: BigInt(siteId),
        ownerUserId: BigInt(ownerUserId),
      },
    });

    if (!site) {
      throw new BadRequestException('Storefront not found for current user.');
    }
  }

  private async assertDomainCapability(
    user: AuthUser,
    type: BindDomainDto['type'],
  ) {
    const key =
      type === 'system_sub'
        ? CAPABILITY_KEYS.domainSystemSub
        : CAPABILITY_KEYS.domainCustom;
    const capability = await this.capabilityService.checkLevelCapability(
      user.levelCode,
      key,
    );

    if (!capability.allowed) {
      throw new BadRequestException('Current level cannot bind this domain type.');
    }
  }

  private async assertDomainLimit(user: AuthUser, siteId: string) {
    const capability = await this.capabilityService.checkLevelCapability(
      user.levelCode,
      CAPABILITY_KEYS.domainMaxCount,
    );

    if (!capability.allowed || capability.limitValue === undefined) {
      return;
    }

    const domainCount = await this.prisma.domain.count({
      where: {
        siteId: BigInt(siteId),
      },
    });

    if (domainCount >= capability.limitValue) {
      throw new BadRequestException('Domain limit reached for current level.');
    }
  }

  private mapSite(site: Site & { domains?: Domain[] }) {
    return {
      id: site.id.toString(),
      ownerUserId: site.ownerUserId.toString(),
      name: site.name,
      logo: site.logo,
      status: site.status,
      templateId: site.templateId?.toString(),
      seoTitle: site.seoTitle,
      seoKeywords: site.seoKeywords,
      seoDescription: site.seoDescription,
      notice: site.notice,
      expiredAt: site.expiredAt,
      domains: site.domains?.map((domain) => this.mapDomain(domain)) ?? [],
    };
  }

  private mapDomain(domain: Domain) {
    return {
      id: domain.id.toString(),
      siteId: domain.siteId?.toString(),
      domain: domain.domain,
      type: domain.type,
      status: domain.status,
      verifyToken: domain.verifyToken,
      sslStatus: domain.sslStatus,
      sslExpiredAt: domain.sslExpiredAt,
      isPrimary: domain.isPrimary,
    };
  }
}
