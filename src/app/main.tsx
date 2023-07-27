import * as React from 'react';
import { GistStorage, Gist, FeedData } from './storage/gistStorage';
import { FeedService } from './feeds/feedService';
import { Feed } from './feeds/feed';
import { ReadingList } from './readingList/readingList';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

interface IMainProps { }
interface IMainState {
  data: Gist;
  store: GistStorage;
  feedServices: FeedService[];
  displayFeeds: boolean;
  darkModeEnabled: boolean;
  debug: boolean;
}

export class Main extends React.Component<IMainProps, IMainState> {
  private refreshTimer: number = -1;
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
        this.setState({ store, data, feedServices, displayFeeds: false, darkModeEnabled: window.location.search.indexOf('dark') !== -1 });
      } else {
        const newState = {... this.state};
        for (let i = 0; i < data.feeds.length; i++) {
          newState.feedServices[i].updateFeedDataOnClear(data.state.updates[data.feeds[i].id]);
        }
        this.setState(newState);
      }
    });
  }

  componentWillMount() {
    // document.addEventListener('visibilitychange', this.handleVisibilityChange, false);
    const store = new GistStorage(this.GetFeed());
    this.loadGist(store);

    this.refreshTimer = window.setInterval(
      () => store.isGistUpdated().then(isUpdated => {
        if (isUpdated) {
          window.clearInterval(this.refreshTimer);
          this.forceUpdate();
          toast.warn('🔃 Need refresh!!', {
            autoClose: 3000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
            progress: undefined,
            theme: "dark",
            });

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

      this.forceUpdate(() => this.displayFeedOnTopOfTheScreen(id));
    };
  }

  displayFeedOnTopOfTheScreen(feedId: number) {
    const feed = document.getElementById(feedId.toString());
    if (feed != null) {
      feed.scrollIntoView(true);
    }
  }

  hashCode = (text: string) => {
    // tslint:disable-next-line:no-bitwise
    return text.split('').reduce((a, b) => { a = (a << 5) - a + b.charCodeAt(0); return a & a; }, 0);
  }

  toggleFeedsIconsVisibility = () => this.setState({...this.state, displayFeeds:!this.state.displayFeeds })
  toggleTheme = () => this.setState({...this.state, darkModeEnabled:!this.state.darkModeEnabled })
  enableDebug = () => this.setState({...this.state, debug:!this.state.debug })

  render() {
    if (this.state === null) {
      return (
        <main className='dark'>
          <div className="loading">
            <div>loading feeds...</div>
            <div className="spinner">&#9676;</div>
          </div>
        </main>);
    }

    return (
      <main className={this.state.darkModeEnabled ? 'dark' : 'light'}>
        <div className="feeds">
          <ToastContainer 
            position="bottom-left"
            autoClose={1000}
            hideProgressBar={false}
            newestOnTop={false}
            closeOnClick
            rtl={false}
            pauseOnFocusLoss
            draggable
            pauseOnHover
            theme={this.state.darkModeEnabled ? 'dark' : 'light'}
            transition={Zoom} />
          {/* <NotificationContainer /> */}
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
                id={i} // to be able to know the une just after (to put it in top of screen when clearing feed)
                feed={feedService}
                debug={this.state.debug}
              />
            )}
          </div>
          <ReadingList data={this.state.data} store={this.state.store} />
        </div>
        <div className='settings'>
        {this.state.displayFeeds && this.state.feedServices.map((feedService: FeedService, i: number) =>
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
        <a onClick={this.toggleFeedsIconsVisibility}>{this.state.displayFeeds ? "Show feeds" : "Hide feeds"}</a> &nbsp;
        <a onClick={this.toggleTheme}>Toggle theme</a> &nbsp;
        <a onClick={this.enableDebug}>Enable debug</a>
        </div>
      </main>
    );
  }
}
