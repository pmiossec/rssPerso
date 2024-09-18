import * as axios from 'axios';
import { FeedData, GistStorage, ReadListItem } from '../storage/gistStorage';
import { toast } from 'react-toastify';

export interface Link extends ReadListItem {
  read: boolean;
  iconUrl: string;
  feedName: string;
  content: string;
}

interface CorsProxyHandler {
  url: string;
  headers: {};
  responseHandler: (response: string) => string;
}

const defaultCorsProxyResponseHandler = (response: string) => {
  return response;
};
const defaultCorsProxyHeaders = { Origin: 'https://pmiossec.github.io/', Usage: 'RssPerso'};

console.log("window.location", window.location);
const isLocal = (): boolean => window.location.hostname === "localhost";
// cors proxy list: https://gist.github.com/jimmywarting/ac1be6ea0297c16c477e17f8fbe51347
const proxyHandler: CorsProxyHandler = {
    url: (isLocal() ? 'localhost:7071' /*'https://corsproxyperso20230118112658-test-slot.azurewebsites.net'/**/ : 'https://corsproxyperso20230118112658.azurewebsites.net') +'/api/CorsProxyPerso?',
    headers: defaultCorsProxyHeaders,
    responseHandler: defaultCorsProxyResponseHandler
  };

export const noRefresh = -1;
const minute = 60_000;
const hour = 60 * minute;
const oneDayInterval = 24 * hour;
const maxRefreshInterval = 30 * minute;
const minRefreshInterval = 10 * minute;
const htmlStipperDomElement = document.createElement('div');

export class FeedService {
  public httpProtocol: string;
  public logo: string;
  public title: string = 'Future title';
  public webSiteUrl: string | null = null;
  public links: Link[] = [];
  public allLinks: Link[] = [];
  public error:  string | null = null;
  public content: string = 'No Content';
  public clearDate: Date = new Date(1900, 1, 1);
  private isOrderNewerFirst = false;
  private shouldDisplayAllLinks: boolean = false;
  public refreshInterval: number = -1;
  public isYoutube: boolean = false;

  constructor(
    public feedData: FeedData,
    public offsetDate: Date,
    public storage: GistStorage
  ) {
    this.links = [];
    this.title = feedData.name;
    this.logo = feedData.icon;
    this.httpProtocol = window.location.protocol;
    this.isYoutube = feedData.url.startsWith("https://www.youtube.com");
    
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
    return (this.shouldDisplayAllLinks ? this.allLinks : this.links)
            .filter(l => this.feedData.filter === undefined
                || l.title.indexOf(this.feedData.filter) === -1);
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
      const content = proxyHandler.responseHandler(response.data);
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
          const error = `${this.feedData.name ?? this.feedData.url}: Parsing failed!`;
          // tslint:disable-next-line:no-console
          console.error(error, this.feedData.name, this.feedData.url, "Failed to parse content:", content);
          toast.error(error + ' (see console...)', { autoClose: 3000 });
          this.title = error;
      }

      this.allLinks = this.sortFeed(this.allLinks);
      this.links = this.sortFeed(this.links);

      if (!this.title) {
        this.title = this.feedData.url;
      }

      if (!this.feedData.name) {
        this.feedData.name = this.title;
      }

      if (!this.feedData.icon) {
        this.feedData.icon = this.logo;
      }


    } catch (ex) {
      this.title = `${this.feedData.url} Error loading :( Error: ${ex}`;
    }
    this.calculateRefreshInterval();
    // tslint:disable-next-line:no-console
    if (this.refreshInterval === noRefresh) {
      console.info(`Refresh ${this.title}: none`); 
    }
    else {
      console.info(`Refresh ${this.title}:`, `${Math.floor(this.refreshInterval / 1000)}s / ${Math.floor(this.refreshInterval / 60_000)}m ${Math.floor(this.refreshInterval % 60_000 / 1000)}s`);
    }
  }

  public async loadFeedContent(): Promise<void> {
    this.error = null;
    const url = ((proxyHandler.url.indexOf('://') != -1) ? proxyHandler.url : `${this.httpProtocol}//${proxyHandler.url}`) + this.feedData.url;
    try {
      const response = await axios.default.get(url, proxyHandler.headers)
      this.processFeedXml(response);
    } catch (error) {
      if (error instanceof axios.AxiosError) {
        this.error = `${error} - Code: ${error.response?.status} - Text: ${error.response?.statusText} `;
        console.error(`Error feed: ${this.title} / ${this.error}`, error);
        return;
      }
      this.error = `${error}`;
      console.error(`Error feed: ${this.title} / ${this.error}`, error);
    }
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

  private transformWebSiteUrl(url: string | null): string {
    const mappings = [
      ["zdnet.fr", "https://www.zdnet.fr"],
      ["lemonde.fr", "https://www.lemonde.fr/autologin"],
      ["mediapart.fr", "https://bnf.idm.oclc.org/login?url=http://www.mediapart.fr/licence"],
      ["arretsurimages.net", "https://bnf.idm.oclc.org/login?url=http://www.arretsurimages.net/autologin.php"],
    ]

    if (!url) {
      return "#";
    }

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      if(url.indexOf(mapping[0]) != -1) {
        return mapping[1];
      }
    }

    return url;
  }

  private transformLinks(url: string | null): string {
    const mappings = [
      ["www.mediapart.fr", "www-mediapart-fr.bnf.idm.oclc.org"],
      ["www.arretsurimages.net", "www-arretsurimages-net.bnf.idm.oclc.org"],
    ]

    if (!url) {
      return "#";
    }

    for (let i = 0; i < mappings.length; i++) {
      const mapping = mappings[i];
      if(url.indexOf(mapping[0]) != -1) {
        return url.replace(mapping[0], mapping[1]);
      }
    }

    return url;
  }
  private manageRssFeed(xmlDoc: HTMLElement): void {
    const channel = this.getElementByTagName(xmlDoc, 'channel');
    if (channel) {
      this.webSiteUrl = this.transformWebSiteUrl(this.getElementContentByTagName(channel, 'link'));
      if (!this.title) {
        this.title = this.getElementContentByTagName(channel, 'title');
      }
    }

    if (!this.logo) {
      //TODO: from content
      // this.logo = this.getElementContentByTagName(xmlDoc, 'icon');
      if (!this.logo && this.webSiteUrl) {
        this.logo = this.webSiteUrl + '/favicon.ico';
      }
    }

    const items = xmlDoc.getElementsByTagName('item');
    for (let iItems = 0; iItems < items.length; iItems++) {
      const item = items.item(iItems);
      if (!item) {
        continue;
      }

      
      let content = this.getElementContentByTagName(item, 'description')
      if(!content || content.length === 0) {
        content = this.getElementContentByTagName(item, 'content:encoded')
      }

      const link = {
        url: this.transformLinks(this.getElementContentByTagName(item, 'link')),
        title: item
          ? this.getElementContentByTagName(item, 'title')
          : 'No tile found :(',
        publicationDate: this.getLinkRssDate(item),
        description: this.stripHtml(content),
        content: content,
        read: false,
        iconUrl: this.feedData.icon,
        feedName: this.feedData.name,
        idFeed: this.feedData.id,
        other: this.getElementContentByTagName(item, 'category')
      };

      this.allLinks.push(link);
      if (link.publicationDate > this.clearDate) {
        this.links.push(link);
      }
    }
  }

  private parseDate(date: string): Date {
    return new Date(
      date.endsWith('Z') ? date.substring(0, date.length - 1) : date
    );
  }

  private getLinkRssDate(element: Element): Date {
    let publicationDateElement = this.getElementByTagName(element, 'pubDate');
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
      //console.log("content_element", foundElement);
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

    for (let iElement = 0; iElement < element.children.length; iElement++) {
      const foundElement = element.children.item(iElement);
      if (foundElement && foundElement.tagName === tagName) {
        return foundElement;
      }
    }
    return null;
  }

  private stripHtml(htmlContent: string): string {
    htmlStipperDomElement.innerHTML = htmlContent;
    return htmlStipperDomElement.textContent || htmlStipperDomElement.innerText;
  }
  
  private manageAtomFeed(xmlDoc: HTMLElement): void {
    // console.log(`Processing Atom feed ( ${this.url} )...`);
    if(!this.title) {
      this.title = this.getElementContentByTagName(xmlDoc, 'title');
    }
    if(!this.logo) {
      this.logo = this.getElementContentByTagName(xmlDoc, 'icon');
      if (!this.logo && this.webSiteUrl) {
        this.logo = this.webSiteUrl + '/favicon.ico';
      }
    }

    const linksWebSite = xmlDoc.getElementsByTagName('link');
    for (let iLinks = 0; iLinks < linksWebSite.length; iLinks++) {
      const tag = linksWebSite.item(iLinks);
      if (tag && tag.getAttribute('rel') === 'alternate') {
        this.webSiteUrl = this.transformWebSiteUrl(tag.getAttribute('href'));
        break;
      }
    }

    const items = xmlDoc.getElementsByTagName('entry');
    for (let iEntries = 0; iEntries < items.length; iEntries++) {
      const item = items.item(iEntries);
      if (!item) {
        continue;
      }

      const linkFound = this.getElementByTagName(item, 'link');
      if (!linkFound) {
        continue;
      }
      
      let content = this.getElementContentByTagName(item, 'description')
      if(!content || content.length === 0) {
        content = this.getElementContentByTagName(item, 'content')
      }
      if(!content || content.length === 0) {
        const mediaGroup = item.getElementsByTagName('media:group');
        if (mediaGroup && mediaGroup.length > 0) {
          content = '<img src="' + this.getElementByTagName(mediaGroup[0], 'media:thumbnail')?.getAttribute("url") + '" /><br/>'
            + this.getElementContentByTagName(mediaGroup[0], 'media:description')?.replaceAll('\n', '<br/>');
        }
      }
      if(!content || content.length === 0) {
        content = this.getElementContentByTagName(item, 'summary')
      }
  
      const link = {
        url: linkFound.getAttribute('href') as string,
        title: this.getElementContentByTagName(item, 'title'),
        publicationDate: this.getLinkAtomDate(item),
        description: this.stripHtml(content),
        content: content,
        other:this.getElementContentByTagName(item, 'category'),
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
    let publicationDateElement = this.getElementByTagName(element, 'published');
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
    if (lastRefreshInterval > 1.5 * oneDayInterval) {
      this.refreshInterval = noRefresh;
      return;
    }

    if (lastRefreshInterval > oneDayInterval) {
      this.refreshInterval = 2 * hour;
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
