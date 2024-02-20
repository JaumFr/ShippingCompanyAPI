import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import puppeteer from 'puppeteer';

interface companiesProps {
  url: string;
  name: string;
  city: string;
}

export interface props {
  uf: string;
  companies: companiesProps[];
}

@Injectable()
export class AppService {
  constructor(@Inject(CACHE_MANAGER) private cacheManager: Cache) {}

  public async getProducts() {
    const cacheKey = 'shipping_companies_data';
    const browser = await puppeteer.launch();

    try {
      const page = await browser.newPage();
      await Promise.all([page.goto('https://ssw.inf.br/2/transportadoras')]);

      const shippingCompanyData = await page.$$eval('tr', async (tr) => {
        const data: props[] = [];

        tr.slice(1).map((td) => {
          const uf = td.querySelector('.transportadora')?.textContent;

          if (uf) {
            data.push({ uf, companies: [] } as props);
          } else {
            const rowData = td.querySelectorAll('td:not(:has(span))');
            const url = td.querySelector('a')?.href;
            const name = rowData[0]?.textContent;
            const city = rowData[1]?.textContent;

            data[data.length - 1].companies.push({ url, name, city });
          }
        });

        return data;
      });

      await this.cacheManager.set(cacheKey, shippingCompanyData, 600000);
      return shippingCompanyData;
    } finally {
      await browser.close();
    }
  }
}
