import { BadRequestException, Injectable } from '@nestjs/common';
import type { Domain, Site } from '@prisma/client';
import { PrismaService } from '../database/prisma.service';
import type { BindDomainDto } from './dto/bind-domain.dto';
import type { CreateSiteDto } from './dto/create-site.dto';

@Injectable()
export class SiteService {
  constructor(private readonly prisma: PrismaService) {}

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
