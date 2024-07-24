import * as React from 'react';
import { FeedService, Link, noRefresh } from './feedService';
import { ReadListItem } from '../storage/gistStorage';
import { Feed } from './feed';

interface IFeedWithAutoRefreshProps {
  feed: FeedService;
  id: number;
  debug: boolean;
  displayContent(content: string) : void; 
  selectNextFeed(currentFeedId: number) : void;
}

interface IFeedWithAutoRefreshState {
  // timerId: number = -1;
}

export class FeedWithAutoRefresh extends React.Component<IFeedWithAutoRefreshProps, IFeedWithAutoRefreshState> {
  timerId: number = -1;

  componentDidMount(): void {
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
      this.props.selectNextFeed(this.props.id);
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
  
  render() {
    const linksToDisplay = this.props.feed.getLinksToDisplay()
      .filter(l => this.props.feed.feedData.filter === undefined
      || l.title.indexOf(this.props.feed.feedData.filter) === -1);

    return <Feed
      id={this.props.id}
      debug={this.props.debug}
      links={linksToDisplay}
      error={this.props.feed.error}
      logoUrl={this.props.feed.logo}
      webSiteUrl={this.props.feed.webSiteUrl as string}
      title={this.props.feed.title}
      feedUrl={this.props.feed.feedData.url}
      isYoutube={this.props.feed.isYoutube}
      enhance={this.props.feed.feedData.enhance === true}
      isDisplayingAllLinks={this.props.feed.isDisplayingAllLinks.bind(this.props.feed)}
      refreshFeed={this.refreshFeed}
      clearFeed ={this.clearFeed}
      clearAllFeed={this.clearAllFeed}
      displayAll={this.displayAll}
      addToReadList={this.addToReadList}
      removeIfFirstOnClick={this.removeIfFirstOnClick}
    
      displayContent={this.props.displayContent}
      selectNextFeed={this.props.selectNextFeed}
    />
  }
}
