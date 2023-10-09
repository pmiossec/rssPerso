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

    const shareUrl = () => navigator.share({url: link.url});
    
    return (<>
        {/* @ts-ignore */}
        {navigator.canShare && <a onClick={shareUrl} className="youtube">{link.title}</a>}
        {!navigator.canShare && <a href={convertToInvidiousUrl(link.url)}
              onMouseOver={() => displayContent(link.content ? `<h1>${link.title}</h1>\n${link.content}` : '')} target="_blank" >
            {link.title}
        </a>
}
    </>);
}