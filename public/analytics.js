/* Isolated measurement document: no project data, forms, download links or titles.
   This document is created only after opt-in on an approved production host. */
(() => {
  if (window.parent === window || location.protocol !== 'https:' || (location.hostname !== 'kkankong32-alt.github.io' || !location.pathname.startsWith('/binteumeopsi/'))) return;
  try { if (localStorage.getItem('binteumeopsi-analytics-consent-v1') !== 'yes') return; } catch { return; }
  const ids=['G-DC7N6KQBG0','G-5YW0T2C109'];
  const labels={home:'메인페이지',studio:'패턴 작업실',showroom:'디자인 쇼룸',puzzle:'틈새 챌린지',learn:'수학 탐구',gallery:'나의 작품'};
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('set',{allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true});
  gtag('js',new Date());
  for(const id of ids) gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_referrer:'',ignore_referrer:true,cookie_expires:2592000});
  const script=document.createElement('script');script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ids[0];document.head.append(script);
  let last='',stopped=false;
  addEventListener('message',event=>{
    if(event.origin!==location.origin||event.source!==parent)return;
    if(event.data?.type==='studio-stop') { stopped=true;gtag('consent','update',{analytics_storage:'denied'});return; }
    const screen=event.data?.screen;
    if(stopped||event.data?.type!=='studio-page'||!Object.hasOwn(labels,screen)||last===screen)return;
    last=screen;
    gtag('event','page_view',{send_to:ids,page_title:'빈틈없이 · '+labels[screen],page_location:location.origin+location.pathname.replace(/analytics\.html$/, '')+'#'+screen,page_referrer:''});
  });
})();
