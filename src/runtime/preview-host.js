const frame=document.querySelector('iframe');
frame.addEventListener('load',()=>{const script=frame.contentDocument.createElement('script');script.src='/dist/preview.js';frame.contentDocument.head.append(script);});
