import { useEffect, useState} from 'react';
import { GistStorage, Gist, FeedData } from './storage/gistStorage';
import { FeedService } from './feeds/feedService';
import { ReadingList } from './readingList/readingList';
import { ToastContainer, toast, Zoom } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import useLocalStorage from 'use-local-storage';
import { FeedWithAutoRefresh } from './feeds/feedWithAutoRefresh';

interface IMainState {
  data: Gist;
  store: GistStorage;
  feedServices: FeedService[];
}

function Main() {
  const [state, setState] = useState<IMainState|null>(null);
  const [debug, setDebug] = useState<boolean>(false);
  const [feedsDisplayed, setFeedsDisplayed] = useState<boolean>(false);
  const [darkModeEnabled, setDarkModeEnabled] = useLocalStorage<boolean>("darkModeEnabled", true);
  const [bearerToken, setBearerToken] = useLocalStorage<string|undefined>("bearerToken", undefined);
  const [bearerTokenTemp, setBearerTokenTemp] = useState<string|undefined>(undefined);
  const [newFeedUrl, setNewFeedUrl] = useState<string>('');
  const [addFeed, setAddFeed] = useState<boolean>(false);
  const [currentArticleDescription, setCurrentArticleDescription] = useState<string>("");

  function GetFeed(): string {
    const feeds: string[] = [
      '1d800438c2edee3e07e547a3d4d20ef1' , // Philippe
      '774782376fbd8d01a8bc2669cdbf6096' // Khanh
    ];

    if (window.location.search.indexOf('khanh') !== -1) {
      return feeds[1];
    }
    return feeds[0];
  }

  function loadGist(store: GistStorage) {
    store.loadGist().then(data => {

      if (state === null) {
        const feedServices = data.feeds.map((feedConfig: FeedData) =>
          new FeedService(
            feedConfig,
            data.state.updates[feedConfig.id],
            store
          )
        );
        setState({ store, data, feedServices });
      } else {
        const newState = {...state};
        for (let i = 0; i < data.feeds.length; i++) {
          newState.feedServices[i].updateFeedDataOnClear(data.state.updates[data.feeds[i].id]);
        }
        setState(newState);
      }
    });
  }

  useEffect(() => {

    if (bearerToken === undefined) {
      return;
    }

    console.log("Loading gist...");
    const store = new GistStorage(GetFeed(), bearerToken);
    loadGist(store);

    const refreshTimer = window.setInterval(
      () => store.isGistUpdated().then(isUpdated => {
        if (isUpdated) {
          window.clearInterval(refreshTimer);
          location.reload();
          // toast.warn('🔃 Need refresh!!', {
          //   autoClose: 3000,
          //   hideProgressBar: false,
          //   closeOnClick: true,
          //   pauseOnHover: true,
          //   draggable: true,
          //   progress: undefined,
          //   theme: "dark",
          //   });

          // loadGist(store);
        }
      }),
      60_000
    );
  }, []);

  // clearAll = () => {
  //   state.data.feeds.forEach(f => f.clearFeed());
  //   this.forceUpdate();
  // }

  // displayAll = () => {
  //   state.data.feeds.forEach(f => f.displayAllLinks());
  //   this.forceUpdate();
  // }

  const displayAllLinks = (feedService: FeedService, id: number) => {
    return () => {
      feedService.displayAllLinks();

      displayFeedOnTopOfTheScreen(id);
    };
  }

  function displayFeedOnTopOfTheScreen(feedId: number) {
    const feed = document.getElementById(feedId.toString());
    if (feed != null) {
      // feed.scrollIntoView(true);
      feed.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  function selectNextFeed(currentFeedId: number) {
    if (!state) {
      return;
    }

    let id = currentFeedId + 1; 
    while(id < state.feedServices.length) {
      const nextFeed = state.feedServices[id];
      if (nextFeed.links.length) {
        console.log("Will Bring to view", nextFeed.feedData, id);
        displayFeedOnTopOfTheScreen(id);
        return;
      }
      
      id++;
    }
  }

  const hashCode = (text: string) => {
    // tslint:disable-next-line:no-bitwise
    return text.split('').reduce((a, b) => { a = (a << 5) - a + b.charCodeAt(0); return a & a; }, 0);
  }

  const saveBearerToken = () => {
    if (bearerTokenTemp
      && bearerTokenTemp.length >= 40 
      && (bearerTokenTemp.startsWith("ghp_") || bearerTokenTemp.startsWith("github_pat_"))) {
        setBearerToken(bearerTokenTemp);
    }
  }

  if (bearerToken === undefined) {
    return (
      <section>
        <label>gist token: <input type="text" onChange={e => setBearerTokenTemp(e.target.value)} /></label>
        <button onClick={saveBearerToken}>Save token</button>
      </section>);
  }


  if (state === null) {
    return (
      <main className='dark'>
        <div className="loading">
          <div>loading feeds...</div>
          <div className="spinner">&#9676;</div>
        </div>
      </main>);
  }

  async function addNewFeed(): Promise<void> {
    if (!newFeedUrl || !state) {
      console.error("config not satisfying");
      return;
    }

    var service = new FeedService({
      id: 1+ Math.max(...state.data.feeds.map(f => +f.id)),
      name: '',
      url: newFeedUrl,
      icon: ''
}, new Date(2000, 1, 1), state.store);
    await service.loadFeedContent();
    console.log("Newfeed", service.feedData );
    state.store.addNewFeed(service.feedData);
  }

  return (
    <main className={darkModeEnabled ? 'dark' : 'light'}>
      <section className='left'>
        <section className="feeds">
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
            theme={darkModeEnabled ? 'dark' : 'light'}
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
          <article className="feeds">
            {state.feedServices.map((feedService: FeedService, i: number) =>
              <FeedWithAutoRefresh
                key={feedService.feedData.id}
                id={i} // to be able to know the one just after (to put it in top of screen when clearing feed)
                feed={feedService}
                debug={debug}
                displayContent={setCurrentArticleDescription}
                selectNextFeed={selectNextFeed}
              />
            )}
          </article>
          <ReadingList data={state.data} store={state.store} />
        </section>
        <div className='settings'>
          <a href="https://bnf.idm.oclc.org/login?url=https://nouveau.europresse.com/access/ip/default.aspx?un=D000067U_1" target='_blank'>€Press</a>
          {/* <a href="https://bnf.idm.oclc.org/login?url=http://www.arretsurimages.net/autologin.php" target='_blank'>Arrêt/Image</a>
          <a href="https://bnf.idm.oclc.org/login?url=http://www.mediapart.fr/licence" target='_blank'>Mediapart</a> */}
          <a href="https://easybnf.fr/nyt" target='_blank'>NYT</a>
          <a href="https://bnf.idm.oclc.org/login?url=https://www.pressreader.com/" target='_blank'>PressReader</a>
          <a href="https://bnf.idm.oclc.org/login?url=https://bnf.mt.musicme.com" target='_blank'>🎶</a>
          <a href="/spotify-perso/" target='_blank'>🎧</a>
          <a href="https://easybnf.fr/" target='_blank'>EasyBNF</a>
          <a href="https://omnivore.app/home?q=in%3Ainbox" target='_blank' title="Omnivore">📖</a>
          | &nbsp;
          <a onClick={() => setFeedsDisplayed(!feedsDisplayed)} title="Show all feeds">{feedsDisplayed ? "Hide feeds" : "📰"}</a>
          <a onClick={() => setDarkModeEnabled(!darkModeEnabled)} title={darkModeEnabled ? "Switch to light theme" : "Switch to dark theme"}>{darkModeEnabled ? "🌞" : "🌚"}</a>
          <a onClick={() => setDebug(!debug)} title="Debug">🐞</a>
          <a href={`https://gist.github.com/pmiossec/${GetFeed()}`} title="Open Gist" target='_blank'><label className="github">&nbsp;&nbsp;</label></a>
          <a onClick={() => setAddFeed(!addFeed)} title="Add new feed"><label className="rss">&nbsp;&nbsp;</label></a>
          {addFeed && <section>
            <label htmlFor="newFeedUrl">Feed Url</label>
            <input type="text" id="newFeedUrl" onChange={e => setNewFeedUrl(e.target.value)} />
            <button onClick={() => addNewFeed()}>Add</button></section>
          }
        </div>

        <div className='settings'>
          {feedsDisplayed && state.feedServices.map((feedService: FeedService, i: number) =>
                <img
                  key={feedService.feedData.id}
                  src={feedService.logo}
                  height="32"
                  width="32"
                  onClick={() => displayAllLinks(feedService, i)}
                  title={feedService.title}
                  className="feed-icon"
                />
              )}
        </div>
      </section>
      <div dangerouslySetInnerHTML={{__html: currentArticleDescription}} className='right' />
    </main>
  );
}

export default Main;