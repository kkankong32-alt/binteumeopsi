/* Isolated measurement document: no project data, forms, download links or titles.
   Enabled by the publisher on the approved production host only. */
(() => {
  if (window.parent === window || location.protocol !== 'https:' || (location.hostname !== 'kkankong32-alt.github.io' || !location.pathname.startsWith('/binteumeopsi/'))) return;
  const ids=['G-DC7N6KQBG0','G-5YW0T2C109'];
  // A Google tag can inherit additional destinations/enhanced events from its
  // account configuration. Enforce this app's two-ID, page-view-only boundary
  // in this isolated document, before loading Google's code.
  const permitted=(url,body)=>{
    const u=new URL(String(url),location.href);
    if(!u.hostname.endsWith('google-analytics.com'))return true;
    return String(body||'').split('\n').every(line=>{
      const p=new URLSearchParams(u.search);new URLSearchParams(line).forEach((v,k)=>p.set(k,v));
      return ids.includes(p.get('tid')) && p.get('en')==='page_view';
    });
  };
  const beacon=navigator.sendBeacon.bind(navigator);
  navigator.sendBeacon=(url,body)=>{
    if(body instanceof Blob){body.text().then(text=>{if(permitted(url,text))beacon(url,body);});return true;}
    return permitted(url,body)?beacon(url,body):true;
  };
  const fetchOriginal=window.fetch.bind(window);
  window.fetch=async(input,options)=>{
    const url=input instanceof Request?input.url:String(input);
    const body=input instanceof Request?await input.clone().text():options?.body instanceof Blob?await options.body.text():options?.body;
    return permitted(url,body)?fetchOriginal(input,options):new Response(null,{status:204});
  };
  const requests=new WeakMap(), open=XMLHttpRequest.prototype.open, send=XMLHttpRequest.prototype.send;
  XMLHttpRequest.prototype.open=function(method,url,...rest){requests.set(this,url);return open.call(this,method,url,...rest);};
  XMLHttpRequest.prototype.send=function(body){if(permitted(requests.get(this),body))return send.call(this,body);};
  const labels={home:'메인페이지',studio:'패턴 작업실',showroom:'디자인 쇼룸',puzzle:'틈새 챌린지',learn:'수학 탐구',gallery:'나의 작품'};
  window.dataLayer=window.dataLayer||[];
  function gtag(){window.dataLayer.push(arguments);}
  window.gtag=gtag;
  gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
  gtag('set',{allow_google_signals:false,allow_ad_personalization_signals:false,ads_data_redaction:true});
  gtag('js',new Date());
  for(const id of ids) gtag('config',id,{send_page_view:false,allow_google_signals:false,allow_ad_personalization_signals:false,page_referrer:'',ignore_referrer:true,cookie_expires:2592000});
  const script=document.createElement('script');script.id='studio-google-tag';script.async=true;script.src='https://www.googletagmanager.com/gtag/js?id='+ids[0];document.head.append(script);
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
