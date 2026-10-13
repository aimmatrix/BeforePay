export function createScanController({collect, assess, currentKey, onChecking, onResult, onError, timeoutMs=6000}) {
  let counter=0, active=null, disposed=false;
  async function scan() {
    if(disposed) return;
    active?.abort();
    const abort=new AbortController(); active=abort;
    const generation=++counter; const key=currentKey();
    onChecking();
    let timer;
    try {
      const observation=collect(String(generation));
      const result=await Promise.race([
        assess(observation,{signal:abort.signal}),
        new Promise((_,reject)=>{timer=setTimeout(()=>{abort.abort();reject(new Error('The check timed out. Please try again.'));},timeoutMs);})
      ]);
      if(!disposed && generation===counter && key===currentKey()){
        if(result.scanId!==observation.scanId || result.pageKey!==observation.pageKey) throw new Error('Assessment belongs to a different page or scan.');
        onResult(result);
      }
    } catch(error) {
      if(!disposed && generation===counter && key===currentKey()) onError(error);
    } finally {clearTimeout(timer);}
  }
  return {scan,invalidate(){counter++;active?.abort();},destroy(){disposed=true;counter++;active?.abort();}};
}
