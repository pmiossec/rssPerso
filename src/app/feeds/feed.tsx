import * as React from 'react';
import { FeedService, Link, noRefresh } from './feedService';
import { ReadListItem } from '../storage/gistStorage';
import YoutubeControls from './YoutubeControls';
import { formatDate } from '../helper';
import { useEffect } from 'react';
import { FeedOnError } from './feedOnError';

interface IFeedProps {
  id: number;
  debug: boolean;
  // New 
  links: Link[];
  error:  string | null;
  logoUrl:  string;
  webSiteUrl: string;
  title: string;
  feedUrl: string;
  isYoutube: boolean;
  enhance: boolean;
  isDisplayingAllLinks(): boolean;
  refreshFeed(): void;
  clearFeed (date: Date): void;
  clearAllFeed(): void;
  displayAll(): void;
  addToReadList(item: ReadListItem, index: number): () => void;
  removeIfFirstOnClick(item: ReadListItem, index: number):  () => void;

  displayContent(content: string) : void; 
  selectNextFeed(currentFeedId: number) : void;
}

interface IFeedState {
  // timerId: number;
}

export function Feed(props: IFeedProps) {
  // https://emojiterra.com/fr/activites/
  const emojies = [
    ['equipe de france', '🇫🇷‍'],
    ['jeux olympiques', '🏅'],
    ['alpinisme', '🧗'],
    ['badminton', '🏸'],
    ['tennis', '🎾'],
    ['nba', '🏀🇺🇸'],
    ['basket', '🏀'],
    ['ligue 1', '⚽🇫🇷'],
    ['bundesliga', '⚽🇩🇪'],
    ['liga', '⚽🇪🇸'],
    ['league', '⚽🇬🇧'],
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
    ['formule e', '🏎'],
    ['hockey', '🏒'],
    ['baseball', '⚾'],
    ['ski alpin', '🎿'],
    ['ski-alpinisme', '🎿'],
    ['médias', '📺'],
    ['equitation', '🏇'],
    ['esport', '💻'],
    ['france', '🇫🇷'],
    ['italie', '🇮🇹'],
    ['espagne', '🇪🇸'],
    ['en direct', '▶️'],
    ['coupe du monde', '🏆🌍'],
    ['autres sports', '❔'],
    ['podcast', '🎙️'],
    ['transferts', '🔃'],
    ['tous sports', '🎽'],
  ];

  function enhanceWithCategory(title: string, other: string | undefined): string {
    if (other === undefined || other === '') {
      return title;
    }

    for(let i = 0; i < emojies.length; i++)
    {
      if (other.toLowerCase().indexOf(emojies[i][0]) !== -1) {
        return `${emojies[i][1]}${title}`;
      }
    }    
    return title;
  }

  const linksToDisplay = props.links;
  if (linksToDisplay.length === 0) {
    if (props.error !== null)
    {
      return (<FeedOnError
                id={props.id.toString()}
                logoUrl={props.logoUrl}
                webSiteUrl={props.webSiteUrl as string}
                title={props.title}
                error={props.error}
                feedUrl={props.feedUrl}
                refreshFeed={props.refreshFeed}
                 />);
    }
    else {
      return <div id={props.id.toString()} />;
    }
  } 
  const options = (
    <span>
      <div className="text-badge close" onClick={props.clearAllFeed}>
        <a>
          {linksToDisplay.length}
        </a>
      </div>
      {!props.isDisplayingAllLinks() &&
        <div className="text-badge" onClick={props.displayAll}>
          <a>All</a>
        </div>}
    </span>
  );

  const now = new Date();
  let links = (
    <div>
      {linksToDisplay.map((l: Link, i: number) =>
        <div key={l.url} className='link'>
          [<a onClick={() => props.clearFeed(l.publicationDate)}>
            {formatDate(l.publicationDate, now)}
          </a>|
          <a onClick={props.addToReadList(l, i)}>📑</a>
          {/* @ts-ignore */}
          {/* {navigator.canShare && '|'  + <a onClick={() => navigator.share({url: link.url})} >🔗</a>} */}
          ]
          {!props.isYoutube && <a
            href={l.url}
            target="_blank"
            rel="noreferrer"
            onClick={props.removeIfFirstOnClick(l, i)}
            // title={l.description}
            onMouseOver={() => props.displayContent(l.content ? `<h1>${l.title}</h1>\n${l.content}` : '')}
          >
            {props.enhance === true ? enhanceWithCategory(l.title, l.other) : l.title}
          </a>
          }
          {props.isYoutube && <YoutubeControls link={l} displayContent={props.displayContent} />}
        </div>
      )}
    </div>
  );

  const closeButton = <div className="close-bottom-right" onClick={props.clearAllFeed}>
    <div className="text-badge refresh">
    <a className="emoji-light">❌</a>
  </div>
</div>

  return (
    <div className="feed" id={props.id.toString()}>
      <div className="title">
        <div>
          <img src={props.logoUrl} onClick={props.refreshFeed}/> &nbsp;
          <a href={props.webSiteUrl as string} target="_blank" rel="noreferrer" >
            {' '}{props.title}
          </a>
          {props.debug && <a href={props.feedUrl} target="_blank" rel="noreferrer" >⚙️</a>}
        </div>
        <div>
          {options}
        </div>
      </div>
      {linksToDisplay.length !== 0 && links}
      {linksToDisplay.length !== 0 && linksToDisplay.length > 2 && closeButton}
    </div>
  );
}
