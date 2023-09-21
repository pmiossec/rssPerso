type YoutubeContolsProps = {
    url: string
}

export default ({url}: YoutubeContolsProps): JSX.Element => {
    const convertToInvidiousUrl = (url: string) => 
        url.indexOf("www.youtube.com") !== -1
            ? url.replace('www.youtube.com', 'yewtu.be')
            : url;

    const copyUrlToClipboard = () => navigator.clipboard.writeText(url);
    
    return (<>
        <a onClick={copyUrlToClipboard}>📋</a>
        <a href={convertToInvidiousUrl(url)} target="_blank" title="Watch on Invidious (privacy friendly!)">
            <img src="invidious.png" alt="Watch on invidious" className="invidious" />
        </a>
    </>);
}