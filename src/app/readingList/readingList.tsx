import { useEffect, useState } from 'react';
import * as Helper from '../helper';
import { GistStorage, ReadListItem, Gist, FeedData } from '../storage/gistStorage';

interface IReadingListProps {
  readList: ReadListItem[] | undefined;
  feeds: FeedData[] | undefined;
  store: GistStorage;
}

function ReadingList({readList, store, feeds}: IReadingListProps) {
  const [displayReadingList, setDisplayReadingList] = useState<boolean>(false);
  const [sortByDate, setSortByDate] = useState<boolean>(false);

  // useEffect({
  //   setInterval(() => refreshReadingList(), 30000);
  // }, []);

  // const refreshReadingList = () => {
  //   this.setState({});
  // }

  const remove = (item: ReadListItem): void => {
    store.removeItemFromReadingList(item);
    // this.refreshReadingList();
  }

  const openAndRemoveLink = (item: ReadListItem) => {
    return () => {
      setTimeout(() => {
        remove(item);
      }, 200);
    };
  }

  const toggleVisibility = () => {
    setDisplayReadingList(!displayReadingList);
  }

  const changeSort = () => {
    const newSort = !sortByDate
    setSortByDate(newSort);
    store.changeSort(newSort);
  }
  
  if (!readList || !feeds) {
    return <div>loading...</div>;
  }

  const readItems = readList.map((l: ReadListItem, i: number) => {
    const feed = feeds.find(f => f.id === l.idFeed);
    const now = new Date();
    return (
      <div key={i}>
        [<span className="date">
          {Helper.DateFormatter.formatDate(l.publicationDate, now)}
        </span>
        |<a href={l.url} target="_blank" rel="noreferrer">
          📄
        </a>
        |<a onClick={() => remove(l)}>❌</a>]
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
          📑 Reading list ({!readList
            ? 0
            : readList.length}):
        </a>
        {displayReadingList &&
          <a onClick={changeSort}>Sort by {sortByDate ? 'feed' : 'date'} </a>}
        {store.couldBeRestored() &&
          <a onClick={store.restoreLastRemoveReadingItem}>
            Restore last deleted item{' '}
          </a>}
      </div>
      <div className="links">
        {displayReadingList && readItems}
      </div>
    </div>
  );
  }


export default ReadingList;