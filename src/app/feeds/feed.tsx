import * as React from 'react';
import * as Helper from '../helper';
import { FeedService, Link, noRefresh } from './feedService';
import { ReadListItem } from '../storage/gistStorage';
import YoutubeControls from './YoutubeControls';

interface IFeedProps {
  feed: FeedService;
  id: number;
  debug: boolean;
}

interface IFeedState { }

export class Feed extends React.Component<IFeedProps, IFeedState> {
  shouldDisplayEmptyFeeds: boolean = false;
  hiddenTextArea: HTMLTextAreaElement = document.createElement('textarea');
  timerId: number = -1;

  componentWillMount(): void {
    this.loadFeed().then(() => {
      if (this.props.feed.refreshInterval === noRefresh) {
        this.timerId = -1;
        return;
      }
      this.timerId = window.setInterval(
        () => this.loadFeed(),
        this.props.feed.refreshInterval
      );
    });
  }

  componentWillUnmount(): void {
    if (this.timerId !== -1) {
      window.clearInterval(this.timerId);
    }
  }

  loadFeed(): Promise<void> {
    return this.props.feed.loadFeedContent().then(() => {
      this.forceUpdate();
    });
  }

  refresh(): void {
    this.forceUpdate();
  }

  clearAllFeed = (): void => {
    this.props.feed.clearAllFeed();
    this.forceUpdate(() => {
      this.displayFeedOnTopOfTheScreen((this.props.id + 1).toString());
    });
  }

  refreshFeed = (): void => {
    this.loadFeed();
  }

  clearFeed = (date: Date): void => {
    this.props.feed.clearFeed(date);
    this.displayFeedOnTopOfTheScreen((this.props.id).toString());
    this.forceUpdate();
  }

  displayFeedOnTopOfTheScreen(feedId: string) {
    const feed = document.getElementById(feedId);
    if (feed != null) {
      feed.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  displayAll = (): void => {
    this.props.feed.displayAllLinks();
    this.forceUpdate();
  }

  openAll = (): void => {
    this.props.feed.getLinksToDisplay().forEach(element => {
      window.open(element.url, '_blank', 'noreferrer');
    });
    this.clearAllFeed();
  }

  addToReadList = (item: ReadListItem, index: number) => {
    return () => {
      const removingItem = index === 0;
      this.props.feed.addItemToReadingList(item, removingItem);
      if (removingItem) {
        this.forceUpdate();
      }
    };
  }

  removeIfFirstOnClick = (item: ReadListItem, index: number) => {
    return () => {
      setTimeout(() => {
        const shouldRemoveItem = index === 0;
        if (shouldRemoveItem) {
          this.clearFeed(item.publicationDate);
          this.forceUpdate();
        }
      }, 200);
  };
  }

  private decodeEntities = (encodedString: string) => {
    this.hiddenTextArea.innerHTML = encodedString;
    return this.hiddenTextArea.value;
  }
  
  // https://emojiterra.com/fr/activites/
  readonly emojies = [
    ['equipe de france', '🇫🇷‍'],
    ['jeux olympiques', '🏅'],
    ['alpinisme', '🧗'],
    ['tennis', '🎾'],
    ['nba', '🏀🇺🇸'],
    ['basket', '🏀'],
    ['ligue 1', '⚽🇫🇷'],
    ['liga', '⚽🇪🇸'],
    ['football', '⚽'],
    ['foot', '⚽'],
    ['handball', '🤾'],
    ['hand', '🤾'],
    ['rugby', '🏉'],
    ['top 14', '🏉🇫🇷'],
    ['golf', '⛳'],
    ['cyclisme', '🚴‍'],
    ['sports us', '🇺🇸'],
    ['sports d\'hiver', '❄️'],
    ['judo', '🥋'],
    ['volley', '🏐'],
    ['boxe', '🥊'],
    ['voile', '⛵'],
    ['equitation', '🏇🏻'],
    ['natation', '🏊🏻'],
    ['escrime', '🤺'],
    ['athlétisme', '🏃‍'],
    ['athlé', '🏃‍'],
    ['auto/moto', '🚗'],
    ['auto', '🚗'],
    ['moto', '🏍️'],
    ['rallycross', '🚕🏔️'],
    ['rallye', '🚕🏔️'],
    ['f1', '🏎'],
    ['hockey', '🏒'],
    ['baseball', '⚾'],
    ['ski alpin', '🎿'],
    ['ski-alpinisme', '🎿'],
    ['médias', '📺'],
    ['equitation', '🏇'],
    ['esport', '💻'],
    ['france', '🇫🇷'],
    ['italie', '🇮🇹'],
    ['en direct', '▶️'],
    ['tous sports', '🎽'],
  ];

  private replaceInTitle = (title: string) => {
    let enhancedTitle = this.decodeEntities(title)
      .replace('  ', ' ');
    
    for(let i = 0; i < this.emojies.length; i++)
    {
      enhancedTitle = enhancedTitle.replace(this.emojies[i][0], this.emojies[i][1]);
    }
    
    return enhancedTitle;
  }

  private enhanceWithCategory(title: string, other: string | undefined): string {
    if (other === undefined || other === '') {
      return title;
    }

    for(let i = 0; i < this.emojies.length; i++)
    {
      if (other.toLowerCase().indexOf(this.emojies[i][0]) !== -1) {
        return `${this.emojies[i][1]}${title}`;
      }
    }    
    return title;
  }

  render() {
    let options = null;
    const linksToDisplay = this.props.feed.getLinksToDisplay()
      .filter(l => this.props.feed.feedData.filter === undefined
      || l.title.indexOf(this.props.feed.feedData.filter) === -1);
    if (linksToDisplay.length !== 0) {
      options = (
        <span>
          <div className="text-badge close" onClick={this.clearAllFeed}>
            <a>
              {linksToDisplay.length}
            </a>
          </div>
          {/* <div className="text-badge refresh" onClick={this.refreshFeed}>
            <a> ⟳
            </a>
          </div> */}
          {!this.props.feed.isDisplayingAllLinks() &&
            <div className="text-badge" onClick={this.displayAll}>
              <a>All</a>
            </div>}
          {/* {linksToDisplay.length !== 0 &&
            <div className="text-badge open" onClick={this.openAll}>
              <a>Open All</a>
            </div>} */}
        </span>
      );
    } else {
      if (this.shouldDisplayEmptyFeeds) {
        options = (
          <span>
            <div className="text-badge" onClick={this.displayAll}>
              <a>All</a>{'  '}
            </div>{' '}
            - Nothing new :(
          </span>
        );
      } else {
        if (this.props.feed.error !== null)
        {
          return (
            <div className="feed" id={this.props.id.toString()}>
            <div className="title">
              <div>
                <img src={this.props.feed.logo} onClick={this.refreshFeed}/> &nbsp;
                <a href={this.props.feed.webSiteUrl as string} target="_blank" rel="noreferrer" >
                  {' '}{this.props.feed.title}
                </a>
              </div>
            </div>
            <div>{this.props.feed.error}<a href={this.props.feed.feedData.url} target="_blank" rel="noreferrer" >⚙️</a></div>
          </div>
          );
        }
        else {
          return <div id={this.props.id.toString()} />;
        }
      }
    }

    const now = new Date();
    let links = (
      <div>
        {linksToDisplay.map((l: Link, i: number) =>
          <div key={l.url}>
            [<a onClick={this.clearFeed.bind(null, l.publicationDate)}>
              {Helper.DateFormatter.formatDate(l.publicationDate, now)}
            </a>|
            <a onClick={this.addToReadList(l, i)}>📑</a>]
            <a
              href={l.url}
              target="_blank"
              rel="noreferrer"
              onClick={this.removeIfFirstOnClick(l, i)}
              title={l.description}
            >
              {this.props.feed.feedData.enhance === true ? this.enhanceWithCategory(l.title, l.other) : l.title}
            </a>
            {this.props.feed.isYoutube && <YoutubeControls url={l.url}  />}
          </div>
        )}
      </div>
    );

    const closeButton = <div className="text-badge refresh close-bottom-right" onClick={this.clearAllFeed}>
    <a className="emoji-light">❌</a>
  </div>

    return (
      <div className="feed" id={this.props.id.toString()}>
        <div className="title">
          <div>
            <img src={this.props.feed.logo} onClick={this.refreshFeed}/> &nbsp;
            <a href={this.props.feed.webSiteUrl as string} target="_blank" rel="noreferrer" >
              {' '}{this.props.feed.title}
            </a>
            {this.props.debug && <a href={this.props.feed.feedData.url} target="_blank" rel="noreferrer" >⚙️</a>}
          </div>
          <div>
            {options}
          </div>
        </div>
        {linksToDisplay.length !== 0 && links}
        {linksToDisplay.length !== 0 && linksToDisplay.length > 8 && closeButton}
      </div>
    );
  }
}
