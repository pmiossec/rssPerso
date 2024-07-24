interface IFeedOnErrorProps
{
    id : string;
    logoUrl: string;
    webSiteUrl: string;
    title: string;
    error: string;
    feedUrl: string;
    refreshFeed(): void;
}

export function FeedOnError(props: IFeedOnErrorProps) {
    return (
        <div className="feed" id={props.id}>
        <div className="title">
          <div>
            <img src={props.logoUrl} onClick={props.refreshFeed}/> &nbsp;
            <a href={props.webSiteUrl as string} target="_blank" rel="noreferrer" >
              {' '}{props.title}
            </a>
          </div>
        </div>
        <div>{props.error} &nbsp; <a href={props.feedUrl} target="_blank" rel="noreferrer" ><label className="rss"></label></a></div>
      </div>)
}