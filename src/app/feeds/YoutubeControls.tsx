type YoutubeContolsProps = {
    url: string;
    title: string;
}

export default ({url, title}: YoutubeContolsProps): JSX.Element => {
    const convertToInvidiousUrl = (url: string) => 
        url.indexOf("www.youtube.com") !== -1
            ? url.replace('www.youtube.com', 'yewtu.be')
            : url;

    const copyUrlToClipboard = () => navigator.clipboard.writeText(url);
    const shareUrl = () => navigator.share({url});
    
    return (<>
        {/* <a onClick={copyUrlToClipboard} className="youtube">📋</a> */}
        {/* @ts-ignore */}
        {navigator.canShare && <a onClick={shareUrl} className="youtube">{title}</a>}
        {!navigator.canShare && <a href={convertToInvidiousUrl(url)} target="_blank" title="Watch on Invidious (privacy friendly!)">
            {title}
            {/* <img src="invidious.png" alt="Watch on invidious" className="invidious" /> */}
        </a>
}
    </>);
}