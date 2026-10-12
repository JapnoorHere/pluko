import test from 'node:test';
import assert from 'node:assert/strict';
import {parseImages,publicIP} from '../provider.mjs';

const record='<a class="iusc" m="{&quot;murl&quot;:&quot;https://images.example/landscape.jpg&quot;,&quot;t&quot;:&quot;Mountain landscape photograph&quot;,&quot;purl&quot;:&quot;https://photos.example/landscape&quot;,&quot;turl&quot;:&quot;https://thumb.example/a.jpg&quot;}" href="/images/search?expw=1200&amp;exph=1800">';
test('extracts safe Bing image metadata',()=>{
  assert.deepEqual(parseImages(record),[{url:'https://images.example/landscape.jpg',width:1200,height:1800,kind:'original',host:'images.example',title:'Mountain landscape photograph',thumbnail:'https://thumb.example/a.jpg',sourceUrl:'https://photos.example/landscape'}]);
});
test('drops malformed and non-web source URLs',()=>{
  assert.equal(parseImages(record+record).length,1);
  assert.equal(parseImages(record.replace('https://images.example/landscape.jpg','javascript:alert(1)')).length,0);
});
test('rejects internal addresses before image requests',()=>{
  for(const ip of ['127.0.0.1','10.0.0.1','172.16.0.1','192.168.1.1','169.254.169.254','::1','fc00::1'])assert.equal(publicIP(ip),false);
  assert.equal(publicIP('8.8.8.8'),true);
});
