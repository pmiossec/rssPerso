import * as React from 'react';
import * as Helper from '../helper';
import { FeedService, Link, noRefresh } from './feedService';
import { ReadListItem } from '../storage/gistStorage';

interface IFeedProps {
  key: number;
  feed: FeedService;
  id: number;
  unsecured?: boolean;
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

  unsecureUrl = (url: string) => {
    return this.props.unsecured ? url.replace('https://', 'http://') : url;
  }

  openAll = (): void => {
    this.props.feed.getLinksToDisplay().forEach(element => {
      window.open(this.unsecureUrl(element.url), '_blank', 'noreferrer');
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
      },
                 200);
  };
  }

  private decodeEntities = (encodedString: string) => {
    this.hiddenTextArea.innerHTML = encodedString;
    return this.hiddenTextArea.value;
  }

  private replaceInTitle = (title: string) => {
    // https://emojiterra.com/fr/activites/
    return this.decodeEntities(title)
      .replace('  ', ' ')
      .replace('Equipe de France', '🇫🇷‍')
      .replace('Jeux olympiques', '🏅')
      .replace('Tennis', '🎾')
      .replace('Basket', '🏀')
      .replace('Football', '⚽')
      .replace('Handball', '🤾')
      .replace('Hand', '🤾')
      .replace('Rugby', '🏉')
      .replace('Golf', '⛳')
      .replace('Cyclisme', '🚴‍')
      .replace('Sports US', '🇺🇸')
      .replace('Sports d\'hiver', '❄️')
      .replace('Judo', '🥋')
      .replace('Volley', '🏐')
      .replace('Boxe', '🥊')
      .replace('Voile', '⛵')
      .replace('Equitation', '🏇🏻')
      .replace('Natation', '🏊🏻')
      .replace('Escrime', '🤺')
      .replace('Athlétisme', '🏃‍')
      .replace('Athlé', '🏃‍')
      .replace('Auto/Moto', '🚗')
      .replace('Auto', '🚗')
      .replace('Moto', '🏍️')
      .replace('F1', '🏎')
      // .replace('Hockey', '🏎')
      .replace('Baseball', '⚾')
      .replace('Ski alpin', '🎿')
      .replace('Rallye', '🚗🌄')
      .replace('Equitation', '🏇')
      .replace('Esport', '💻')
      .replace('NBA', '🏀🇺🇸')
      .replace('France', '🇫🇷')
      ;
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
          <div className="text-badge refresh" onClick={this.refreshFeed}>
            <a> ⟳
            </a>
          </div>
          {!this.props.feed.isDisplayingAllLinks() &&
            <div className="text-badge" onClick={this.displayAll}>
              <a>All</a>
            </div>}
          {linksToDisplay.length !== 0 &&
            <div className="text-badge open" onClick={this.openAll}>
              <a>Open All</a>
            </div>}
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
        return <div id={this.props.id.toString()} />;
      }
    }

    let links = (
      <div>
        {linksToDisplay.map((l: Link, i: number) =>
          <div key={i}>
            [<a onClick={this.clearFeed.bind(null, l.publicationDate)}>
              {Helper.DateFormatter.formatDate(l.publicationDate)}
            </a>|
            <a onClick={this.addToReadList(l, i)}>📑</a>]
            <a
              href={this.unsecureUrl(l.url)}
              target="_blank"
              rel="noreferrer"
              onClick={this.removeIfFirstOnClick(l, i)}
            >
              {this.props.feed.feedData.enhance === true ? this.replaceInTitle(l.title) : l.title}
            </a>
          </div>
        )}
      </div>
    );

    return (
      <div className="feed" id={this.props.id.toString()}>
        <div className="title">
          <div>
            <img src={this.props.feed.logo} />
            <a href={this.props.feed.webSiteUrl as string} target="_blank" rel="noreferrer" >
              {' '}{this.props.feed.title}
            </a>
          </div>
          <div>
            {options}
          </div>
        </div>
        {linksToDisplay.length !== 0 && links}
      </div>
    );
  }
}
