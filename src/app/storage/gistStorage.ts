import { Voussoir } from './pareil';
import * as axios from 'axios';
import { toast } from 'react-toastify';

export interface Gist {
  feeds: FeedData[];
  state: State;
  readList: ReadListItem[];
  revisionCount: number;
}

export interface FeedData {
  id: number;
  name: string;
  url: string;
  icon: string;
  noCorsProxy?: boolean;
  enhance?: boolean;
  filter?: string;
}

interface Feeds {
  feeds: FeedData[];
}

export interface State {
  last_update: Date;
  updates: { [feedid: string]: Date };
  raw_url: string;
}

export interface ReadListItem {
  idFeed: number;
  title: string;
  url: string;
  publicationDate: Date;
  description: string;
  other: string | undefined;
}

interface GistFileDescription {
  filename: string;
  type: string;
  language: string;
  raw_url: string;
  size: string;
  truncated: string;
  content: string;
}

interface GistFileContent extends GistFileDescription {
  truncated: string;
  content: string;
}

interface GistFilesContent {
  [fileId: string]: GistFileContent;
}

interface Storage {
  files: GistFilesContent;
  history: {}[];
  updated_at: string;
}

interface GistFileUpdate {
  content: string;
}
interface GistUpdate {
  description: string;
  files: { [fileId: string]: GistFileUpdate };
}

interface UserGistUpdates {
  id: string;
  // updated_at: string;
  files: { [fileId: string]: GistFileDescription };
}

const FeedFileKey: string = 'feed.json';
const FeedStateFileKey: string = 'state.json';
const ReadingListFileKey: string = 'readlist.json';
const GithubApiUrl: string = 'https://api.github.com/';

export class GistStorage {
  public receivedPromise: axios.AxiosPromise<{}>;
  public dataFetched: boolean = false;
  private lastUpdate: Date;
  private lastItemRemoved: ReadListItem | null;
  private updateGistUrl: string = GithubApiUrl + 'users/pmiossec/gists?since=';

  private data: Gist;
  private gistUrl: string;
  private gistId: string;
  private isPushingAnUpdate: boolean = false;

  constructor(gistId: string) {
    this.gistId = gistId;
    this.gistUrl = `${GithubApiUrl}gists/${gistId}`;
    axios.default.defaults.headers.common.Authorization = atob('QmVhcmVyIA==')
                                                           + atob('Z2hwXzcyYk9sOXB4RVlWWU5ndn'
                                                           + Voussoir);
  }

  public isGistUpdated = (): Promise<boolean> => {
    if (this.isPushingAnUpdate) {
      return Promise.resolve(false);
    }
    const updateDate = new Date(this.lastUpdate.getTime());
    updateDate.setSeconds(updateDate.getSeconds() + 1);
    return axios.default
    .get(this.updateGistUrl + updateDate.toISOString())
    .then((response: axios.AxiosResponse<UserGistUpdates[]>) => {
      if (response.data.filter(g => g.id === this.gistId
        && g.files[FeedStateFileKey].raw_url !== this.data.state.raw_url).length === 0 ) {
        return false;
      }
      return true;
    })
    .catch(err => {
      // tslint:disable-next-line:no-console
      console.error('Failed to load the gist.', err);
      toast.error(`Gist loading:\n${err}`, { autoClose: 10000});
      return false;
    });
  }

  public loadGist = (): Promise<Gist> => {
    return this.getDataFromRemote()
      .then(data => {
        if (data === null) {
          return {} as Gist;
        }
        this.data = {
          feeds: this.getFeedsData(data.files),
          state: this.getFeedStateData(data.files),
          readList: this.getReadingListData(data.files),
          revisionCount: data.history.length
        };
        this.lastUpdate = new Date(data.updated_at);
        this.saveDataInLocalStorage();
        // tslint:disable-next-line:no-console
        // console.log('data from gist received:', this.data);

        return this.data;
      })
      .catch(err => {
        // tslint:disable-next-line:no-console
        console.error(err);
        toast.warning('Loading data from cache...');
        this.data = JSON.parse(localStorage.getItem('rssPerso')!) as Gist;
        return this.data;
      });
  }

  //#region Convert gist data
  private getFeedsData = (data: GistFilesContent) => (JSON.parse(data[FeedFileKey].content) as Feeds).feeds;

  private getFeedStateData = (data: GistFilesContent): State => {
    const content = data[FeedStateFileKey].content;
    if (content === '') {
      return { last_update: new Date(1990, 1, 1), updates: {}, raw_url: '' };
    }
    const state = (JSON.parse(content) as State);
    state.last_update = new Date(state.last_update);
    state.raw_url = data[FeedStateFileKey].raw_url;
    Object.keys(state.updates).forEach(k => state.updates[k] = new Date(state.updates[k]));
    return state;
  }

  private getReadingListData = (data: GistFilesContent): ReadListItem[] => {
    const content = data[ReadingListFileKey].content;
    if (content === '') {
      return [];
    }
    return this.sortListByFeed((JSON.parse(
      content
    ) as ReadListItem[])
      .map(i => {
        return {
          idFeed: i.idFeed,
          title: i.title,
          url: i.url,
          publicationDate: new Date(i.publicationDate),
          description: i.description,
          other: i.other
        };
      }));
  }
  //#endregion

  private getDataFromRemote = () => {
    return axios.default
      .get(`${this.gistUrl}?disable-cache=${new Date().getTime()}`)
      .then((response: axios.AxiosResponse<Storage>) => {
        this.dataFetched = true;
        const data = response.data;
        return data;
      })
      .catch(err => {
        // tslint:disable-next-line:no-console
        console.error('Failed to load the gist.', err);
        toast.error(`Error Gist loading:\n${err}`, { autoClose: 10000 });
        return null;
      });
  }

  private saveFileToGist = (content: GistUpdate) => {
    this.saveDataInLocalStorage();
    this.isPushingAnUpdate = true;
    return axios.default
      .patch(this.gistUrl, content)
      .then((response: axios.AxiosResponse<Storage>) => {
        const newRevisionCount = response.data.history.length;
        if (newRevisionCount > this.data.revisionCount + 1) {
          toast.warning('Probable data loss. Please refresh!!');
        }
        var updateGist = new Date(response.data.updated_at);
        // strange value where github set in the gist not the same time than in the save response (with 1s more :()
        updateGist.setSeconds(updateGist.getSeconds() + 10);
        this.lastUpdate = updateGist;
        this.data.revisionCount = newRevisionCount;
        this.data.state.raw_url = response.data.files[FeedStateFileKey].raw_url;
        this.data.readList = this.getReadingListData(response.data.files);
        // this.shouldBeSaved = false;
        this.isPushingAnUpdate = false;
        toast.success('Saved!', { autoClose: 1000, hideProgressBar: true });
      })
      .catch(err => {
        this.isPushingAnUpdate = false;
        toast.error(`Error on Update saved Save 👎:\n${err}`);
        // tslint:disable-next-line:no-console
        console.error('err saving state:', err);
        throw err;
      });
  }

  public updateFeedState = (feedId: number, date: Date) => {
    this.data.state.updates[feedId] = date;
  }

  public saveFeedsState = (feedId: number, title: string, date: Date) => {
    this.updateFeedState(feedId, date);
    this.data.state.last_update = new Date();
    this.saveFileToGist({
      description: `Update publication date for feed "${title}"`,
      files: {
        [FeedStateFileKey]: { content: JSON.stringify(this.data.state, null, '\t') }
      }
    });
  }

  private saveReadingList = (
    readingList: ReadListItem[],
    description: string,
    state: State | null = null
  ) => {
    let filesToSave = {
      [ReadingListFileKey]: { content: JSON.stringify(readingList, null, '\t') }
    };

    if (state !== null) {
      this.data.state.last_update = new Date();
      filesToSave[FeedStateFileKey] = {
        content: JSON.stringify(this.data.state, null, '\t')
      };
    }
    return this.saveFileToGist({
      description: description && 'Update reading list',
      files: filesToSave
    });
  }

  public addItemToReadingList = (
    item: ReadListItem,
    saveAlsoFeedState: boolean
  ) => {
    toast.info('Adding to 📃', { autoClose: 1000 });

    if (this.data.readList.findIndex(i => i.url === item.url) > 0) {
      toast.warning('📃 Duplicate link', { autoClose: 1000 });
      return;
    }

    this.data.readList.push(item);
    this.saveReadingList(this.data.readList, `Add item "${item.title}"`, saveAlsoFeedState ? this.data.state : null)
      // tslint:disable-next-line:no-empty
      .catch(() => {});
  }

  public removeItemFromReadingList = (item: ReadListItem): void => {
    const msg = `Removing '${item.title}' from reading list`;
    toast.warning(`📃 ${msg}`, { autoClose: 1000 });
    var indexFound = this.data.readList.findIndex(i => {
      return i.url === item.url;
    });
    if (indexFound !== -1) {
      this.data.readList.splice(indexFound, 1);
      this.saveReadingList(this.data.readList, msg)
        .then(() => {
          this.lastItemRemoved = item;
        })
        .catch(() => {
          this.data.readList.splice(indexFound, 0, item);
        });
    }
  }

  public restoreLastRemoveReadingItem = () => {
    if (this.lastItemRemoved != null) {
      this.data.readList.push(this.lastItemRemoved);
      this.saveReadingList(this.data.readList, `Restoring item "${this.lastItemRemoved.title}"`)
          .then(() => { this.lastItemRemoved = null; })
          // tslint:disable-next-line:no-empty
          .catch(() => {});
    }
  }

  public couldBeRestored = () => this.lastItemRemoved != null;

  private saveDataInLocalStorage = () => {
    localStorage.setItem('rssPerso', JSON.stringify(this.data, null, '\t'));
  }

  public sortListByDate = (readList: ReadListItem[]) => {
    return readList.sort((i1, i2) => {
      return (
        i2.publicationDate.getTime() -
        i1.publicationDate.getTime()
      );
    });
  }

  public sortListByFeed = (readList: ReadListItem[]) => {
    return readList.sort((i1, i2) => {
      if (i1.idFeed === i2.idFeed) {
        return i2.publicationDate.getTime() - i1.publicationDate.getTime();
      }
      return i1.idFeed - i2.idFeed;
    });
  }
}
