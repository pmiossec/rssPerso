import * as React from 'react';
import * as Helper from '../helper';
import { GistStorage, ReadListItem, Gist } from '../storage/gistStorage';

interface IReadingListProps {
  data: Gist;
  store: GistStorage;
}

interface IReadingListState {}

export class ReadingList extends React.Component<
  IReadingListProps,
  IReadingListState
> {
  private displayReadingList: boolean = false;
  private sortByDate: boolean = false;

  componentDidMount(): void {
    setInterval(() => this.refreshReadingList(), 30000);
  }

  refreshReadingList = () => {
    this.setState({});
  }

  remove = (item: ReadListItem): void => {
    this.props.store.removeItemFromReadingList(item);
    this.refreshReadingList();
  }

  openAndRemoveLink = (item: ReadListItem) => {
    return () => {
      setTimeout(() => {
        this.remove(item);
      },         200);
    };
  }

  toggleVisibility = () => {
    this.displayReadingList = !this.displayReadingList;
    this.refreshReadingList();
  }

  changeSort = () => {
    this.sortByDate = !this.sortByDate;
    this.props.data.readList = this.sortByDate
      ? this.props.store.sortListByDate(this.props.data.readList)
      : this.props.store.sortListByFeed(this.props.data.readList);
    this.refreshReadingList();
  }

  render() {
    var readItems;
    if (!this.props.data) {
      readItems = <div>loading...</div>;
    } else {
      const data = this.props.data;
      readItems = data.readList.map((l: ReadListItem, i: number) => {
        const feed = data.feeds.find(f => f.id === l.idFeed);
        const now = new Date();
        return (
          <div key={i}>
            [<span className="date">
              {Helper.DateFormatter.formatDate(l.publicationDate, now)}
            </span>
            |<a href={l.url} target="_blank" rel="noreferrer">
              📄
            </a>
            |<a onClick={this.remove.bind(null, l)}>❌</a>]
            <a href={l.url} target="_blank" rel="noreferrer" onClick={this.openAndRemoveLink(l)}>
              {feed && <img src={feed.icon} />}
              {l.title}
            </a>
          </div>
        );
      });
    }

    if (this.props.data) {
      return (
        <div className="feed">
          <div className="title">
            <a onClick={this.toggleVisibility}>
              📑 Reading list ({!this.props.data.readList
                ? 0
                : this.props.data.readList.length}):
            </a>
            {this.displayReadingList &&
              <a onClick={this.changeSort}>Sort by {this.sortByDate ? 'feed' : 'date'} </a>}
            {this.props.store.couldBeRestored() &&
              <a onClick={this.props.store.restoreLastRemoveReadingItem}>
                Restore last deleted item{' '}
              </a>}
          </div>
          <div className="links">
            {this.displayReadingList && readItems}
          </div>
        </div>
      );
    } else {
      return <div />;
    }
  }
}
