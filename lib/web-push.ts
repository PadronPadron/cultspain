// Standards-based Web Push using Workers Web Crypto (RFC 8291 / RFC 8292).
const encoder=new TextEncoder();
export const b64=(bytes:Uint8Array)=>btoa(String.fromCharCode(...bytes)).replaceAll('+','-').replaceAll('/','_').replace(/=+$/,'');
export function unb64(value:string){if(!/^[A-Za-z0-9_-]+$/.test(value))throw Error('Invalid key');return Uint8Array.from(atob(value.replaceAll('-','+').replaceAll('_','/')),c=>c.charCodeAt(0));}
const join=(...arrays:Uint8Array[])=>{const out=new Uint8Array(arrays.reduce((n,a)=>n+a.length,0));let n=0;for(const a of arrays){out.set(a,n);n+=a.length}return out;};
async function hkdf(secret:Uint8Array,salt:Uint8Array,info:Uint8Array,length:number){const key=await crypto.subtle.importKey('raw',new Uint8Array(secret),'HKDF',false,['deriveBits']);return new Uint8Array(await crypto.subtle.deriveBits({name:'HKDF',hash:'SHA-256',salt:new Uint8Array(salt),info:new Uint8Array(info)},key,length*8));}
export function validPushEndpoint(endpoint:string){try{const u=new URL(endpoint);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&!u.hash&&(u.hostname.endsWith('.push.apple.com')||u.hostname==='fcm.googleapis.com'||u.hostname==='updates.push.services.mozilla.com'||u.hostname==='updates-autopush.stage.mozaws.net')}catch{return false}}
export async function newVapidKeys(){const pair=await crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']);return {publicKey:b64(new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey))),privateKey:await crypto.subtle.exportKey('jwk',pair.privateKey)};}
export async function encryptPush(publicKey:string,auth:string,payload:string,provided?:{pair:CryptoKeyPair;salt:Uint8Array}){
 const ua=unb64(publicKey),secret=unb64(auth);if(ua.length!==65||ua[0]!==4||secret.length!==16)throw Error('Invalid subscription keys');
 const plain=encoder.encode(payload);if(plain.length>3000)throw Error('Push payload too large');
 const pair=provided?.pair||await crypto.subtle.generateKey({name:'ECDH',namedCurve:'P-256'},true,['deriveBits']);const salt=provided?.salt||crypto.getRandomValues(new Uint8Array(16));
 const server=new Uint8Array(await crypto.subtle.exportKey('raw',pair.publicKey));const client=await crypto.subtle.importKey('raw',ua,{name:'ECDH',namedCurve:'P-256'},false,[]);
 const shared=new Uint8Array(await crypto.subtle.deriveBits({name:'ECDH',public:client},pair.privateKey,256));
 const ikm=await hkdf(shared,secret,join(encoder.encode('WebPush: info\0'),ua,server),32);
 const cek=await hkdf(ikm,salt,encoder.encode('Content-Encoding: aes128gcm\0'),16),nonce=await hkdf(ikm,salt,encoder.encode('Content-Encoding: nonce\0'),12);
 const key=await crypto.subtle.importKey('raw',cek,'AES-GCM',false,['encrypt']);const cipher=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv:nonce},key,join(plain,new Uint8Array([2]))));
 const header=new Uint8Array(21);header.set(salt);new DataView(header.buffer).setUint32(16,4096);header[20]=65;return join(header,server,cipher);
}
export async function pushRequest(subscription:any,keys:{publicKey:string;privateKey:JsonWebKey},payload:any){
 if(!validPushEndpoint(subscription.endpoint))throw Error('Unsupported push endpoint');
 const body=await encryptPush(subscription.keys.p256dh,subscription.keys.auth,JSON.stringify(payload));
 const head=b64(encoder.encode(JSON.stringify({typ:'JWT',alg:'ES256'}))),claims=b64(encoder.encode(JSON.stringify({aud:new URL(subscription.endpoint).origin,exp:Math.floor(Date.now()/1000)+3600,sub:'https://cultspain.com'})));
 const unsigned=head+'.'+claims,key=await crypto.subtle.importKey('jwk',keys.privateKey,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);const signature=new Uint8Array(await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},key,encoder.encode(unsigned)));
 return {method:'POST',headers:{'Authorization':`vapid t=${unsigned}.${b64(signature)}, k=${keys.publicKey}`,'Content-Encoding':'aes128gcm','Content-Type':'application/octet-stream','TTL':'3600','Urgency':'normal'},body,redirect:'error' as const};
}
