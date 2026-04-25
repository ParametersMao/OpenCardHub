import { Injectable } from '@nestjs/common';
import { CatalogService } from '../catalog/catalog.service';
import { SiteService } from '../site/site.service';

@Injectable()
export class StorefrontService {
  constructor(
    private readonly siteService: SiteService,
    private readonly catalogService: CatalogService,
  ) {}

  async getStorefrontByHost(host: string) {
    const resolved = await this.siteService.resolveSiteEntityByHost(host);
    const products = await this.catalogService.listResolvedSiteProducts(
      resolved.site.id.toString(),
    );

    return {
      host: resolved.host,
      domain: {
        id: resolved.domain.id.toString(),
        domain: resolved.domain.domain,
        type: resolved.domain.type,
      },
      site: {
        id: resolved.site.id.toString(),
        name: resolved.site.name,
        logo: resolved.site.logo,
        seoTitle: resolved.site.seoTitle,
        seoKeywords: resolved.site.seoKeywords,
        seoDescription: resolved.site.seoDescription,
        notice: resolved.site.notice,
      },
      products,
    };
  }
}
