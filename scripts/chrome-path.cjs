const fs=require('node:fs');
const cached='/private/tmp/beforepay-browsers/chromium-1234/chrome-mac-arm64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing';
module.exports=process.env.BEFOREPAY_CHROME || (fs.existsSync(cached)?cached:undefined);
