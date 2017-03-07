import * as axios from 'axios';

export class RemoteStore {
  public jsonStoreUrl: string = 'https://jsonblob.com/api/jsonBlob';
  public jsonStoreBlobUrl: string = 'https://jsonblob.com/api/jsonBlob/ebba8dc9-0378-11e7-a0ba-7f55dedc152c';

  private aLongLongTimeAgo: Date = new Date(1900, 1, 1);
  private shouldBeSaved: boolean = false;
  private state: any;

  constructor() {
    setInterval(this.updateState, 5000);
    this.getRemoteState();
  }

  updateFeedDate = (url: string, date: Date) => {
    if (!this.state || !this.state.updates) {
      this.state = {
        updates: {}
      };
    }
    this.state.updates[url] = date;
    if (!this.state.last_update || this.state.last_update < date) {
      this.state.last_update = date;
    }
    this.shouldBeSaved = true;
  }

  getDateForFeed = (url: string): Date => {
    if (!this.state) {
      return this.aLongLongTimeAgo;
    }
    if (this.state.updates[url]) {
      return this.state.updates[url];
    }
    return this.aLongLongTimeAgo;
  }

  getRemoteState = () => {
    return axios.get(this.jsonStoreBlobUrl)
      .then((response: Axios.AxiosXHR<any>) => {
        this.state = response.data;
        console.log('data fetched', this.state);
        return this.state;
      })
      .catch(err => {
        console.log('err fetching online state:', err);
        return {
          last_update: this.aLongLongTimeAgo,
          updates: {}
        };
      });
  }

  updateState = () => {
    if (!this.shouldBeSaved) {
      return;
    }
    axios.put(this.jsonStoreBlobUrl, this.state)
      .then((response: Axios.AxiosXHR<any>) => {
        this.shouldBeSaved = false;
        console.log('data saved ;)');
      })
      .catch(err => {
        console.log('err saving state:', err);
      });
    }
}
