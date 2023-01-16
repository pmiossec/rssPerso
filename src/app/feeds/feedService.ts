import * as axios from 'axios';
import { FeedData, GistStorage, ReadListItem } from '../storage/gistStorage';
import { NotificationManager } from 'react-notifications';

export interface Link extends ReadListItem {
  read: boolean;
  iconUrl: string;
  feedName: string;
}

interface CorsProxyHandler {
  url: string;
  headers: {};
  responseHandler: (response: string) => string;
}

const defaultCorsProxyResponseHandler = (response: string) => {
  return response;
};
// const defaultCorsProxyHeaders = { Origin: 'https://pmiossec.github.io/'};

// cors proxy list: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
const proxyHandlers: CorsProxyHandler[] = [
  {
    url: 'cors-anywhere.herokuapp.com/',
    headers: { headers: {
      'X-Requested-With': 'XMLHttpRequest',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:64.0) Gecko/20100101 Firefox/64.0'
    } },
    responseHandler: defaultCorsProxyResponseHandler
  }
  // ,
  // {
  //   url: 'thingproxy.freeboard.io/fetch/',
  //   headers: defaultCorsProxyHeaders,
  //   responseHandler: defaultCorsProxyResponseHandler
  // },
  // {
  //   url: 'crossorigin.me/',
  //   headers: defaultCorsProxyHeaders,
  //   responseHandler: defaultCorsProxyResponseHandler
  // }
  // {
  //   url: 'jsonp.herokuapp.com/?url=',
  //   headers: { headers: { 'X-Requested-With': 'XMLHttpRequest' } },
  //   responseHandler: (response: string) => {
  //     return response;
  //   }
  // },
  // {
  //   url: 'galvanize-cors-proxy.herokuapp.com/',
  //   headers: {},
  //   responseHandler: (response: string) => {
  //     return response;
  //   }
  // }
];

export const noRefresh = -1;
const minute = 60 * 1000;
const hour = 60 * minute;
const oneDayInterval = 24 * hour;
const maxRefreshInterval = 30 * minute;
const minRefreshInterval = 5 * minute;

export class FeedService {
  private proxySwitcher: number = 0;
  private proxyHandler: CorsProxyHandler;
  public httpProtocol: string;
  public logo: string;
  public title: string = 'Future title';
  public webSiteUrl: string | null = null;
  public links: Link[] = [];
  public allLinks: Link[] = [];
  public content: string = 'No Content';
  public clearDate: Date = new Date(1900, 1, 1);
  private isOrderNewerFirst = false;
  private shouldDisplayAllLinks: boolean = false;
  public refreshInterval: number = -1;

  constructor(
    public feedData: FeedData,
    public offsetDate: Date,
    public storage: GistStorage
  ) {
    this.links = [];
    this.title = feedData.name;
    this.logo = feedData.icon;
    this.httpProtocol = window.location.protocol;
    this.proxyHandler = proxyHandlers[feedData.id % proxyHandlers.length];
    if (this.offsetDate !== null) {
      this.restoreInitialClearDate(this.offsetDate);
    }
  }

  public clearAllFeed = (): void => {
    if (this.links && this.links.length !== 0) {
      const indexNewerLink = this.isOrderNewerFirst ? 0 : this.links.length - 1;
      this.clearDate = this.links[indexNewerLink].publicationDate;
    } else {
      this.clearDate = new Date();
    }
    this.links = new Array<Link>();
    this.shouldDisplayAllLinks = false;
    this.storeClearDate(this.clearDate);
  }

  public clearFeed = (date: Date): void => {
    this.updateFeedDataOnClear(date);
    this.storeClearDate(this.clearDate);
  }

  public addItemToReadingList = (item: ReadListItem, clearFeed: boolean) => {
    if (clearFeed) {
      this.updateFeedDataOnClear(item.publicationDate);
      this.storage.updateFeedState(this.feedData.id, item.publicationDate);
    }
    this.storage.addItemToReadingList(item, clearFeed);
  }

  public updateFeedDataOnClear(date: Date) {
    this.clearDate = date;
    this.links = this.links.filter(l => l.publicationDate > this.clearDate);
    this.shouldDisplayAllLinks = false;
  }

  public getLinksToDisplay(): Link[] {
    return this.shouldDisplayAllLinks ? this.allLinks : this.links;
  }

  public isDisplayingAllLinks(): boolean {
    return (
      this.shouldDisplayAllLinks || this.allLinks.length === this.links.length
    );
  }

  public displayAllLinks(): void {
    this.shouldDisplayAllLinks = !this.shouldDisplayAllLinks;
  }

  // tslint:disable-next-line:no-any
  private processFeedXml = (response: axios.AxiosResponse<any>) => {
    this.allLinks = [];
    this.links = [];
    const parser = new DOMParser();
    try {
      var content = this.proxyHandler.responseHandler(response.data);
      const xmlDoc = parser.parseFromString(content, 'text/xml');
      const feedFormat = xmlDoc.documentElement.tagName;
      switch (feedFormat) {
        case 'rss':
        case 'rdf:RDF':
          this.manageRssFeed(xmlDoc.documentElement);
          break;
        case 'feed':
          this.manageAtomFeed(xmlDoc.documentElement);
          break;
        default:
          const error = `${this.feedData.url} => Feed format not supported:` + feedFormat;
          // tslint:disable-next-line:no-console
          console.error(error);
          NotificationManager.error(error, 'Feed format not supported', 5000);
          this.title = error;
      }

      this.allLinks = this.sortFeed(this.allLinks);
      this.links = this.sortFeed(this.links);

      if (!this.title) {
        this.title = this.feedData.url;
      }
    } catch (ex) {
      this.title = `${this.feedData.url} Error loading :( Error: ${ex}`;
    }
    this.calculateRefreshInterval();
    // tslint:disable-next-line:no-console
    console.info('Refresh ' + this.title, this.refreshInterval / 1000);
  }

  public loadFeedContent(): Promise<void> {
    const url = this.feedData.noCorsProxy
      ? this.feedData.url
      : this.httpProtocol + '//' + this.proxyHandler.url + this.feedData.url;
    return axios.default
      .get(url, this.feedData.noCorsProxy ? undefined : this.proxyHandler.headers)
      .then(this.processFeedXml)
      .catch(err => {
        this.proxySwitcher++;
        if (this.proxySwitcher > proxyHandlers.length) {
          return new Promise<void>((resolve, reject) => {
            reject();
          });
        }

        this.proxyHandler =
          proxyHandlers[
            (this.feedData.id + this.proxySwitcher) % proxyHandlers.length
          ];
        return this.loadFeedContent();
        // localStorage.setItem('use_proxy.' + this.url, 'true');
      });
  }

  private storeClearDate(clearDate: Date): void {
    this.storage.saveFeedsState(
      this.feedData.id,
      this.feedData.name,
      clearDate
    );
  }

  private restoreInitialClearDate(clearDate: Date): void {
    if (this.clearDate < clearDate) {
      this.clearDate = clearDate;
    }
  }

  private manageRssFeed(xmlDoc: HTMLElement): void {
    const channel = this.getElementByTagName(xmlDoc, 'channel');
    if (channel) {
      this.webSiteUrl = this.getElementContentByTagName(channel, 'link');
    }

    const items = xmlDoc.getElementsByTagName('item');
    for (var iItems = 0; iItems < items.length; iItems++) {
      const item = items.item(iItems);
      if (!item) {
        continue;
      }
      var link = {
        url: this.getElementContentByTagName(item, 'link'),
        title: item
          ? this.getElementContentByTagName(item, 'title')
          : 'No tile found :(',
        publicationDate: this.getLinkRssDate(item),
        read: false,
        iconUrl: this.feedData.icon,
        feedName: this.feedData.name,
        idFeed: this.feedData.id
      };

      this.allLinks.push(link);
      if (link.publicationDate > this.clearDate) {
        this.links.push(link);
      }
    }
  }

  private parseDate(date: string): Date {
    return new Date(
      date.endsWith('Z') ? date.substr(0, date.length - 1) : date
    );
  }

  private getLinkRssDate(element: Element): Date {
    var publicationDateElement = this.getElementByTagName(element, 'pubDate');
    if (publicationDateElement && publicationDateElement.textContent) {
      return this.parseDate(publicationDateElement.textContent);
    }

    publicationDateElement = this.getElementByTagName(element, 'dc:date');
    if (publicationDateElement && publicationDateElement.textContent) {
      return this.parseDate(publicationDateElement.textContent);
    }

    // tslint:disable-next-line:no-console
    console.log('date not found :(', this.feedData.url);
    return new Date(2000, 1, 1);
  }

  private getElementContentByTagName(
    element: Element | Document,
    tagName: string
  ): string {
    const foundElement = this.getElementByTagName(element, tagName);
    if (foundElement && foundElement.textContent) {
      return foundElement.textContent;
    }
    return '';
  }

  private getElementByTagName(
    element: Element | Document,
    tagName: string
  ): Element | null {
    if (!element || !element.children) {
      return null;
    }
    var iElement: number;
    for (iElement = 0; iElement < element.children.length; iElement++) {
      const foundElement = element.children.item(iElement);
      if (foundElement && foundElement.tagName === tagName) {
        return foundElement;
      }
    }
    return null;
  }

  // private formatWebsiteUrl(url: string): string {
  //   return url; // .replace('https://', 'http://');
  // }

  private manageAtomFeed(xmlDoc: HTMLElement): void {
    // console.log(`Processing Atom feed ( ${this.url} )...`);
    this.title = this.getElementContentByTagName(xmlDoc, 'title');
    // this.logo = this.getElementContentByTagName(xmlDoc, 'icon');
    const linksWebSite = xmlDoc.getElementsByTagName('link');
    for (var iLinks = 0; iLinks < linksWebSite.length; iLinks++) {
      var tag = linksWebSite.item(iLinks);
      if (tag && tag.getAttribute('rel') === 'alternate') {
        this.webSiteUrl = tag.getAttribute('href');
        break;
      }
    }
    // if (!this.logo && this.webSiteUrl) {
    //   this.logo = this.formatWebsiteUrl(this.webSiteUrl) + '/favicon.ico';
    // }
    const items = xmlDoc.getElementsByTagName('entry');
    for (var iEntries = 0; iEntries < items.length; iEntries++) {
      const item = items.item(iEntries);
      if (!item) {
        continue;
      }

      const linkFound = this.getElementByTagName(item, 'link');
      if (!linkFound) {
        continue;
      }
      var link = {
        url: linkFound.getAttribute('href') as string,
        title: this.getElementContentByTagName(item, 'title'),
        publicationDate: this.getLinkAtomDate(item),
        read: false,
        iconUrl: this.feedData.icon,
        feedName: this.feedData.name,
        idFeed: this.feedData.id
      };
      this.allLinks.push(link);
      if (link.publicationDate > this.clearDate) {
        this.links.push(link);
      }
    }
  }

  private sortFeed = (links: Link[]): Link[] => {
    const inverter = this.isOrderNewerFirst ? -1 : 1;
    return links.sort((l1, l2) => {
      return inverter * (l1.publicationDate < l2.publicationDate ? -1 : 1);
    });
  }

  private getLinkAtomDate(element: Element): Date {
    var publicationDateElement = this.getElementByTagName(element, 'published');
    if (publicationDateElement && publicationDateElement.textContent) {
      return this.parseDate(publicationDateElement.textContent);
    }

    publicationDateElement = this.getElementByTagName(element, 'updated');
    if (publicationDateElement && publicationDateElement.textContent) {
      return this.parseDate(publicationDateElement.textContent);
    }

    return new Date();
  }

  public calculateRefreshInterval() {
    if (!this.allLinks || this.allLinks.length === 0) {
      this.refreshInterval = maxRefreshInterval;
      return;
    }

    const lastFeedDate = this.allLinks[this.allLinks.length - 1].publicationDate;
    const lastRefreshInterval = new Date().getTime() - lastFeedDate.getTime();
    if (lastRefreshInterval > 2 * oneDayInterval) {
      this.refreshInterval = noRefresh;
      return;
    }

    if (lastRefreshInterval > oneDayInterval) {
      this.refreshInterval = maxRefreshInterval;
      return;
    }

    const dates = this.allLinks.map(l => {
      return l.publicationDate.getTime();
    });

    const datesExcludingFirstAndLast = dates.slice(1, dates.length - 1);
    const diffs: number[] = [];
    for (let i = 0; i < datesExcludingFirstAndLast.length - 1 ; i++) {
      diffs.push(datesExcludingFirstAndLast[i + 1] - datesExcludingFirstAndLast[i]);
    }

    const meanInterval = diffs.reduce((d1, d2) => d1 + d2, 0) / diffs.length;
    this.refreshInterval = Math.max(
      Math.min(maxRefreshInterval, meanInterval / 2),
      minRefreshInterval
    ) + Math.random() * minute ;
  }
}
