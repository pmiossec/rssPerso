import * as React from 'react';
import { FeedService, Link, noRefresh } from './feedService';
import { ReadListItem } from '../storage/gistStorage';
import { Feed } from './feed';
import { useEffect, useState } from 'react';

interface IFeedWithAutoRefreshProps {
  feed: FeedService;
  id: number;
  debug: boolean;
  displayContent(content: string) : void; 
  selectNextFeed(currentFeedId: number) : void;
}

interface IFeedWithAutoRefreshState {
  // timerId: number = -1;
  links: Link[];
  error: string | null;
  logoUrl: string;
  webSiteUrl: string;
  title: string;
  feedUrl: string
  isYoutube: boolean;
  enhance: boolean;
}

export function FeedWithAutoRefresh(props: IFeedWithAutoRefreshProps) {
  let timerId: number = -1;

  const [error, setError] = useState<string | null>(null);
  // state = {error: null
  const [logoUrl, setlogoUrl] = useState("null");
  const [webSiteUrl, setwebSiteUrl] = useState("null");
  const [title, settitle] = useState('Future title');
  const [feedUrl, setfeedUrl] = useState(props.feed.feedData.url);
  const [isYoutube, setIsYoutube] = useState(props.feed.isYoutube);
  const [enhance, setEnhance] = useState(props.feed.feedData.enhance === true);
  const [links, setLinks] = useState<Link[]>([]);

  useEffect(() => {
    loadFeed().then(() => {
      if (props.feed.refreshInterval === noRefresh) {
        timerId = -1;
        return;
      }
      
      timerId = window.setInterval(
        () => loadFeed(),
        props.feed.refreshInterval
      );
    });
    return () => {
      if (timerId !== -1) {
        window.clearInterval(timerId);
      }
    }
  }, []);

  function updateFeedState(): void {
    setError(props.feed.error);
    setLinks(props.feed.getLinksToDisplay());
    setlogoUrl(props.feed.logo);
    setwebSiteUrl(props.feed.webSiteUrl as string);
    settitle(props.feed.title);
  }

  function loadFeed(): Promise<void> {
    return props.feed.loadFeedContent().then(() => {
      updateFeedState();
    });
  }

  function refresh(): void {
    updateFeedState();
  }

  function clearAllFeed(): void {
    props.feed.clearAllFeed();
    setLinks(props.feed.getLinksToDisplay());
    // TODO
    // () => {
    //   props.selectNextFeed(props.id);
    // });
  }

  function refreshFeed(): void {
    loadFeed();
  }

  function clearFeed(date: Date): void {
    props.feed.clearFeed(date);
    displayFeedOnTopOfTheScreen((props.id).toString());
    updateFeedState();
  }

  function displayFeedOnTopOfTheScreen(feedId: string) {
    const feed = document.getElementById(feedId);
    if (feed != null) {
      feed.scrollIntoView({
        block: 'nearest',
        inline: 'nearest',
        behavior: 'smooth'
      });
    }
  }

  function displayAll(): void {
    props.feed.displayAllLinks();
    updateFeedState();
  }

  function addToReadList(item: ReadListItem, index: number) {
    return () => {
      const removingItem = index === 0;
      props.feed.addItemToReadingList(item, removingItem);
      if (removingItem) {
        updateFeedState();
      }
    };
  }

  function removeIfFirstOnClick(item: ReadListItem, index: number) {
    return () => {
      setTimeout(() => {
        const shouldRemoveItem = index === 0;
        if (shouldRemoveItem) {
          clearFeed(item.publicationDate);
          updateFeedState();
        }
      }, 200);
  };
  }
  
  return <Feed
      id={props.id}
      debug={props.debug}
      links={links}
      error={error}
      logoUrl={logoUrl}
      webSiteUrl={webSiteUrl as string}
      title={title}
      feedUrl={props.feed.feedData.url}
      isYoutube={props.feed.isYoutube}
      enhance={props.feed.feedData.enhance === true}
      isDisplayingAllLinks={props.feed.isDisplayingAllLinks.bind(props.feed)}
      refreshFeed={refreshFeed}
      clearFeed ={clearFeed}
      clearAllFeed={clearAllFeed}
      displayAll={displayAll}
      addToReadList={addToReadList}
      removeIfFirstOnClick={removeIfFirstOnClick}
    
      displayContent={props.displayContent}
      selectNextFeed={props.selectNextFeed}
    />
}
