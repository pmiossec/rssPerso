import * as React from 'react';
import { GistStorage, ReadListItem, Gist } from '../storage/gistStorage';
import { formatDate } from '../helper';

interface IReadingListProps {
  data: Gist;
  store: GistStorage;
}

export function ReadingList(props: IReadingListProps) {
  const [readListItems, setReadListItems] = React.useState<ReadListItem[]>([]);
  const [isDisplayed, setIsDisplayed] = React.useState(false);
  const [sortedByDate, setSortedByDate] = React.useState(false);

  React.useEffect(() => {
    refreshReadingList();
    setInterval(() => refreshReadingList(), 30000);
  }, []);

  function refreshReadingList() {
    setReadListItems(props.data.readList);
  }

  function remove(item: ReadListItem) {
    props.store.removeItemFromReadingList(item)
      .then(() => {
        refreshReadingList();
      });
  }

  function openAndRemoveLink(item: ReadListItem) {
    return () => {
      setTimeout(() => {
        remove(item);
      }, 200);
    };
  }

  function toggleVisibility() {
    setIsDisplayed(!isDisplayed);
  }

  function changeSort() {
    const isSortedByDate = !sortedByDate;
    setSortedByDate(isSortedByDate);
    setReadListItems(isSortedByDate
      ? props.store.sortListByDate(props.data.readList)
      : props.store.sortListByFeed(props.data.readList));
  }

  if (!props.data) {
    return (<div>loading...</div>);
  }

  const data = props.data;
  const now = new Date();
  const readItems = readListItems.map((l: ReadListItem, i: number) => {
    const feed = data.feeds.find(f => f.id === l.idFeed);
    return (
      <div key={i}>
        [<span className="date">
          {formatDate(l.publicationDate, now)}
        </span>
        |<a href={l.url} target="_blank" rel="noreferrer">
          📄
        </a>
        |<a onClick={remove.bind(null, l)}>❌</a>]
        <a href={l.url} target="_blank" rel="noreferrer" onClick={openAndRemoveLink(l)}>
          {feed && <img src={feed.icon} />}
          {l.title}
        </a>
      </div>
    );
  });

  return (
    <div className="feed">
      <div className="title">
        <a onClick={toggleVisibility}>
          📑 Reading list ({!readItems
            ? 0
            : readItems.length}):
        </a>
        {isDisplayed &&
          <a onClick={changeSort}>Sort by {sortedByDate ? 'feed' : 'date'} </a>}
        {props.store.couldBeRestored() &&
          <a onClick={props.store.restoreLastRemoveReadingItem}>
            Restore last deleted item{' '}
          </a>}
      </div>
      <div className="links">
        {isDisplayed && readItems}
      </div>
    </div>
  );
}
