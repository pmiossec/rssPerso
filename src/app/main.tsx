import * as React from 'react';
import { GistStorage, Gist, FeedData } from './storage/gistStorage';
import { FeedService } from './feeds/feedService';
import { Feed } from './feeds/feed';
import { ReadingList } from './readingList/readingList';
import { NotificationContainer, NotificationManager } from 'react-notifications';
import 'react-notifications/lib/notifications.css';

interface IMainProps { }
interface IMainState {
  data: Gist;
  store: GistStorage;
  feedServices: FeedService[];
}

export class Main extends React.Component<IMainProps, IMainState> {
  private refreshTimer: number = -1;
  private darkModeEnabled: boolean = true;
  private displayFeeds: boolean = false;
  GetFeed(): string {
    const feeds: string[] = [
      '1d800438c2edee3e07e547a3d4d20ef1' , // Philippe
      '774782376fbd8d01a8bc2669cdbf6096' // Khanh
    ];

    if (window.location.search.indexOf('khanh') !== -1) {
      return feeds[1];
    }
    return feeds[0];
  }

  loadGist(store: GistStorage) {
    store.loadGist().then(data => {

      if (this.state === null) {
        const feedServices = data.feeds.map((feedConfig: FeedData) =>
          new FeedService(
            feedConfig,
            data.state.updates[feedConfig.id],
            store
          )
        );
        this.setState({ store, data, feedServices });
      } else {
        const newState = {... this.state};
        for (let i = 0; i < data.feeds.length; i++) {
          newState.feedServices[i].updateFeedDataOnClear(data.state.updates[data.feeds[i].id]);
        }
        this.setState(newState);
        this.forceUpdate();
      }
    });
  }

  componentWillMount() {
    this.darkModeEnabled = window.location.search.indexOf('dark') !== -1;
    // document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
    const store = new GistStorage(this.GetFeed());
    this.loadGist(store);

    this.refreshTimer = window.setInterval(
      () => store.isGistUpdated().then(isUpdated => {
        if (isUpdated) {
          window.clearInterval(this.refreshTimer);
          this.forceUpdate();
          NotificationManager.warning(
            'Need refresh!!',
            'Updated',
            5000
          );

          this.loadGist(store);
        }
      }),
      1000 * 60
    );
  }

  // clearAll = () => {
  //   this.state.data.feeds.forEach(f => f.clearFeed());
  //   this.forceUpdate();
  // }

  // displayAll = () => {
  //   this.state.data.feeds.forEach(f => f.displayAllLinks());
  //   this.forceUpdate();
  // }

  displayAllLinks = (feedService: FeedService, id: number) => {
    return () => {
      feedService.displayAllLinks();

      this.forceUpdate(() => { this.displayFeedOnTopOfTheScreen(id.toString()); });
    };
  }

  displayFeedOnTopOfTheScreen(feedId: string) {
    const feed = document.getElementById(feedId);
    if (feed != null) {
      feed.scrollIntoView(true);
    }
  }

  hashCode = (text: string) => {
    // tslint:disable-next-line:no-bitwise
    return text.split('').reduce((a, b) => { a = (a << 5) - a + b.charCodeAt(0); return a & a; }, 0);
  }

  toggleFeedsIconsVisibility = () => {
    this.displayFeeds = !this.displayFeeds;
    this.forceUpdate();
  }

  render() {
    if (this.state === null) {
      return (
        <main className={this.darkModeEnabled ? 'dark' : 'light'}>
          <div className="loading">
            <div>loading feeds...</div>
            <div className="spinner">&#9676;</div>
          </div>
        </main>);
    }

    return (
      <main className={this.darkModeEnabled ? 'dark' : 'light'}>
        <div className="feeds">
          <NotificationContainer />
          {/* <div className="displayModes">
          <a onClick={this.clearAll}>Clear All</a> / <a onClick={this.displayAll}>Show All</a>
        </div> */}
          {/* <div>
        {this.state.data.feeds.map((feed: FeedData, i: number) =>
             <img key={i} src={feed.icon} height="16px" alt={feed.name} />
          )}
        </div> */}
          <div className="feeds">
            {this.state.feedServices.map((feedService: FeedService, i: number) =>
              <Feed
                key={feedService.feedData.id}
                id={i}
                feed={feedService}
                unsecured={feedService.feedData.notSecured}
              />
            )}
          </div>
          <ReadingList data={this.state.data} store={this.state.store} />
        </div>
        <div>
        {!this.displayFeeds && <a onClick={this.toggleFeedsIconsVisibility}>Show feeds </a>}
        {this.displayFeeds && this.state.feedServices.map((feedService: FeedService, i: number) =>
              <img
                key={feedService.feedData.id}
                src={feedService.logo}
                height="48"
                width="48"
                onClick={this.displayAllLinks(feedService, i)}
                title={feedService.title}
                className="feed-icon"
              />
            )}
        </div>
      </main>
    );
  }
}
