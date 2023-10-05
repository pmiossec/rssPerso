import { Link } from "./feedService";

type YoutubeContolsProps = {
    link: Link;
    displayContent(content: string) : void; 
}

export default ({link, displayContent}: YoutubeContolsProps): JSX.Element => {
    const convertToInvidiousUrl = (url: string) => 
        url.indexOf("www.youtube.com") !== -1
            ? url.replace('www.youtube.com', 'yewtu.be')
            : url;

    const copyUrlToClipboard = () => navigator.clipboard.writeText(link.url);
    const shareUrl = () => navigator.share({url: link.url});
    
    return (<>
        {/* <a onClick={copyUrlToClipboard} className="youtube">📋</a> */}
        {/* @ts-ignore */}
        {navigator.canShare && <a onClick={shareUrl} className="youtube">{link.title}</a>}
        {!navigator.canShare && <a href={convertToInvidiousUrl(link.url)}
              onMouseOver={() => displayContent(link.content)} target="_blank" title="Watch on Invidious (privacy friendly!)">
            {link.title}
            {/* <img src="invidious.png" alt="Watch on invidious" className="invidious" /> */}
        </a>
}
    </>);
}