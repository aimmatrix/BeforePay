if(location.port==='4174')location.replace('http://127.0.0.1:4173'+location.pathname+location.search+location.hash);
else {const frame=document.querySelector('iframe');
frame.addEventListener('load',()=>{const script=frame.contentDocument.createElement('script');script.src='/dist/preview.js';frame.contentDocument.head.append(script);});
}
