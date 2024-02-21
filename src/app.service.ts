import { Inject, Injectable } from '@nestjs/common';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Cache } from 'cache-manager';
import puppeteer from 'puppeteer';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

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

  getBrowser = () =>
    IS_PRODUCTION
      ? puppeteer.connect({
          browserWSEndpoint:
            'wss://chrome.browserless.io?token=9257730f-3de8-4366-b976-adedf01ce56d',
        })
      : puppeteer.launch();

  public async getProducts() {
    const cacheKey = 'shipping_companies_data';
    const browser = await this.getBrowser();

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
