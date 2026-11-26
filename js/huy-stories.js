/* File: js/huy-stories.js
 * Purpose: Charts and calculator for Huy's pages (story-winter, story-young, what-can-be-done), from huy-preview/js/huy-preview.js.
 *          The shared header, reading settings, navigation and age group come from interactions.js, so this copy leaves
 *          out the prototype's own initAccessibility() call and nav highlighting.
 * Project: COS30045 · Team MienTayDuo */
// Wrapped in a function so its names (get, parse, initAccessibility, ...) do not clash with the shared scripts
(() => {
const order = ['0-7','8-16','17-25','26-39','40-64','65-74','75+'];
const colors = {blue:'#2167ab',grey:'#6e797d'};
const one = n => Number(n).toFixed(1);
const parse = (row) => Object.fromEntries(Object.entries(row).map(([key,value]) => [key.trim(), String(value ?? '').trim() === '' || String(value).trim().toLowerCase() === 'n.p.' ? null : String(value).trim()]));
const number = (row,key) => { const n=Number(row[key]); return row[key] === null || !Number.isFinite(n) ? null : n; };
const get = async (filename,columns) => {
 const source=location.protocol==='file:'&&typeof PREVIEW_DATA!=='undefined'?PREVIEW_DATA[filename]:null;
 const rows=source?source.map(parse):await d3.csv(`data/${filename}`,parse);
 if(!rows.length || columns.some(c=>!Object.hasOwn(rows[0],c))) throw Error(`Invalid columns in ${filename}`);
 const numeric=columns.filter(c=>!['season','Age group'].includes(c));
 if(rows.some(row=>numeric.some(c=>number(row,c)===null))) throw Error(`Missing or invalid chart values in ${filename}`);
 return rows;
};
const svg = (target,title,desc,w,h) => {const root=d3.select(target).html('').append('svg').attr('width',w).attr('height',h).attr('role','group');root.append('title').text(title);root.append('desc').text(desc);return root;};
// A11Y: keyboard-focusable marks share their visible tooltip text with screen-reader labels.
const mark = (selection,label) => selection.attr('tabindex',0).attr('role','img').attr('aria-label',label);
const drawSeason = (avg,years,mode,year,showPed,showAll,onYear) => {
 const host=document.getElementById('season-chart'),w=Math.max(340,host.clientWidth),m={l:58,r:20,t:30,b:54};
 if(mode==='year'){
  const pairs=d3.range(2011,2022).map(yr=>({year:yr,summer:years.find(d=>number(d,'Calendar year')===yr&&d.season==='Summer'),winter:years.find(d=>number(d,'Calendar year')===yr&&d.season==='Winter')}));
  if(pairs.some(d=>!d.summer||!d.winter))throw Error('Missing winter/summer year');
  const h=520,chart=svg(host,'Winter versus summer by year','Each row joins summer and winter pedestrian shares. The selected year is highlighted.',w,h),x=d3.scaleLinear([0,13],[m.l,w-m.r]),y=d3.scaleBand(pairs.map(d=>String(d.year)),[m.t,h-m.b]).padding(.38);
  chart.append('g').attr('class','grid').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(5).tickSize(-(h-m.b-m.t)).tickFormat(''));
  chart.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x).ticks(5).tickFormat(v=>`${v}%`));
  chart.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).tickSize(0).tickPadding(10));
  const mid=d=>y(String(d.year))+y.bandwidth()/2;
  chart.append('rect').attr('x',m.l-38).attr('y',y(String(year))-5).attr('width',w-m.l-m.r+40).attr('height',y.bandwidth()+10).attr('rx',7).attr('fill','#eaf2f9').lower();
  chart.selectAll('line.pair').data(pairs).join('line').attr('class','pair').attr('x1',d=>x(number(d.summer,'ped_share_pct'))).attr('x2',d=>x(number(d.winter,'ped_share_pct'))).attr('y1',mid).attr('y2',mid).attr('stroke',d=>d.year===year?colors.blue:'#b0bdc1').attr('stroke-width',d=>d.year===year?4:2);
  // A11Y: summer and winter dots follow the visual year-by-year order when tabbed.
  chart.selectAll('g.year-dots').data(pairs).join('g').attr('class','year-dots').each(function(d){
   for(const [season,color] of [['summer',colors.grey],['winter',colors.blue]]){
    const dot=d3.select(this).append('circle').attr('class',season).attr('cx',x(number(d[season],'ped_share_pct'))).attr('cy',mid(d)).attr('r',d.year===year?7:5).attr('fill',color).style('cursor','pointer')
     .on('click',event=>onYear(d.year,season,event.currentTarget)).on('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();onYear(d.year,season,event.currentTarget);}});
    mark(dot,`${d.year} ${season}: ${one(number(d[season],'ped_share_pct'))}% pedestrian share of road injury admissions. Activate to select year.`);
    dot.attr('role','button').attr('aria-pressed',String(d.year===year));
   }
  });
  const selected=pairs.find(d=>d.year===year);
  const gap=number(selected.winter,'ped_share_pct')-number(selected.summer,'ped_share_pct');
  const higher=pairs.filter(d=>number(d.winter,'ped_share_pct')>number(d.summer,'ped_share_pct')).length;
  document.getElementById('season-announcement').textContent=`${year}: winter ${one(number(selected.winter,'ped_share_pct'))}% vs summer ${one(number(selected.summer,'ped_share_pct'))}%, a ${one(gap)} percentage-point gap. Winter share was higher in ${higher} of ${pairs.length} years; the largest gap was in ${pairs.reduce((best,d)=>number(d.winter,'ped_share_pct')-number(d.summer,'ped_share_pct')>number(best.winter,'ped_share_pct')-number(best.summer,'ped_share_pct')?d:best).year}.`;
  document.getElementById('season-caption').textContent='Each pair compares winter and summer within the same year. Click a dot, or focus it and press Enter or Space, to select that year.';
  document.querySelector('#season-table thead').innerHTML='<tr><th>Year</th><th>Summer share</th><th>Winter share</th></tr>';
  document.querySelector('#season-table tbody').innerHTML=pairs.map(d=>`<tr><th>${d.year}</th><td>${one(number(d.summer,'ped_share_pct'))}%</td><td>${one(number(d.winter,'ped_share_pct'))}%</td></tr>`).join('');
  return;
 }
 const h=340,chart=svg(host,'Seasonal hospitalisations','Compare pedestrians with all road injuries. Detailed values follow in a table.',w,h);
 const rows=['Summer','Autumn','Winter','Spring'].map(season=>avg.find(d=>d.season===season));
 const x=d3.scaleBand(rows.map(d=>d.season),[m.l,w-m.r]).padding(.28),y=d3.scaleLinear([0,130],[h-m.b,m.t]);
 chart.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5).tickSize(-(w-m.l-m.r)).tickFormat(''));
 chart.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x));
 chart.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(5));
 chart.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(100)).attr('y2',y(100)).attr('stroke','#52616a').attr('stroke-dasharray','4,4');
 const series=[['ped_index','Pedestrians',colors.blue,showPed],['all_index','All road injuries',colors.grey,showAll]].filter(d=>d[3]);
 const band=x.bandwidth()/Math.max(1,series.length);
 series.forEach(([field,label,color],i)=>{mark(chart.selectAll(`rect.${field}`).data(rows).join('rect').attr('class',field).attr('x',d=>x(d.season)+i*band).attr('y',d=>y(number(d,field))).attr('width',Math.max(2,band-3)).attr('height',d=>y(0)-y(number(d,field))).attr('fill',color),d=>`${d.season}: ${label} index ${one(number(d,field))}; 100 is average`);
  const winter=rows.find(d=>d.season==='Winter');chart.append('text').attr('x',x('Winter')+i*band+band/2).attr('y',y(number(winter,field))-8).attr('text-anchor','middle').attr('font-size',13).attr('font-weight',700).attr('fill','#323b43').text(one(number(winter,field)));
 });
 const winter=rows.find(d=>d.season==='Winter');document.getElementById('season-announcement').textContent=`Winter: pedestrians ${one(number(winter,'ped_index'))} versus all road injuries ${one(number(winter,'all_index'))}. Each index uses its own average of 100.`;document.getElementById('season-caption').textContent='These are relative seasonal patterns, not raw case totals. The horizontal line marks an average season for each series.';
 document.querySelector('#season-table thead').innerHTML='<tr><th>Season</th><th>Pedestrian index</th><th>All road injury index</th></tr>';
 document.querySelector('#season-table tbody').innerHTML=rows.map(d=>`<tr><th>${d.season}</th><td>${one(number(d,'ped_index'))}</td><td>${one(number(d,'all_index'))}</td></tr>`).join('');
};
const winter=async()=>{
 const [avg,years]=await Promise.all([get('season_2011_2019.csv',['season','ped_index','all_index']),get('season_by_year.csv',['Calendar year','season','ped_share_pct'])]);
 const winterIndex=number(avg.find(d=>d.season==='Winter'),'ped_index');document.querySelector('[data-stat="winter-index"]').textContent=Math.round(winterIndex);document.querySelector('[data-stat="winter-diff"]').textContent=`+${Math.round(winterIndex-100)}%`;
 const state={mode:'average',year:2011,ped:true,all:true};let timer=null;
 const stop=()=>{if(timer)clearInterval(timer);timer=null;document.getElementById('play').textContent='Play';};
 const render=()=>{for(const [id,on] of [['average',state.mode==='average'],['yearly',state.mode==='year'],['ped-toggle',state.ped],['all-toggle',state.all]])document.getElementById(id).setAttribute('aria-pressed',String(on));document.getElementById('season-controls').hidden=state.mode!=='year';document.getElementById('series-controls').hidden=state.mode!=='average';document.getElementById('season-legend').innerHTML=state.mode==='year'?'<span class="swatch comparison"></span><span>Summer pedestrian share</span><span class="swatch pedestrian"></span><span>Winter pedestrian share</span><span class="reference">Percent of road injury admissions</span>':'<span class="swatch pedestrian"></span><span>Pedestrians</span><span class="swatch comparison"></span><span>All road injuries</span><span class="reference">Dashed line: average season (100)</span>';document.getElementById('season-year').value=state.year;document.getElementById('season-year-value').textContent=state.year;drawSeason(avg,years,state.mode,state.year,state.ped,state.all,(yr,season,source)=>{const keyboardFocus=document.activeElement===source;stop();state.year=yr;render();if(keyboardFocus){const dot=[...document.querySelectorAll(`#season-chart circle.${season}`)].find(node=>node.__data__?.year===yr);dot?.focus({preventScroll:true});}});};
 for(const [id,mode] of [['average','average'],['yearly','year']])document.getElementById(id).addEventListener('click',()=>{stop();state.mode=mode;render();});
 document.getElementById('season-year').addEventListener('input',e=>{stop();state.year=Number(e.target.value);render();});
 for(const [id,key] of [['ped-toggle','ped'],['all-toggle','all']])document.getElementById(id).addEventListener('click',()=>{if(state[key]&&!state[key==='ped'?'all':'ped'])return;state[key]=!state[key];render();});
 document.getElementById('play').addEventListener('click',()=>{if(timer){stop();return;}if(document.body.classList.contains('reduce-motion')||matchMedia('(prefers-reduced-motion: reduce)').matches){document.getElementById('season-announcement').textContent='Automatic playback is off for reduced motion. Use the year slider to step through.';return;}document.getElementById('play').textContent='Pause';timer=setInterval(()=>{state.year=state.year===2021?2011:state.year+1;render();},1100);});
 window.addEventListener('pagehide',stop);window.addEventListener('mtd-reduced-motion',stop);matchMedia('(prefers-reduced-motion: reduce)').addEventListener('change',event=>{if(event.matches)stop();});new ResizeObserver(()=>render()).observe(document.getElementById('season-chart'));render();
};
const young=async()=>{
 const data=await get('age_story_2021.csv',['Age group','Hospitalisations','ped_admissions','ped_share_of_age_pct','ped_admissions_per_100k']);
 if(data.length!==order.length||order.some(age=>data.filter(d=>d['Age group']===age).length!==1)||data.some(d=>number(d,'Hospitalisations')<=0))throw Error('Age groups or denominators are incomplete');
 const rows=order.map(age=>data.find(d=>d['Age group']===age)),host=document.getElementById('young-chart');
 const youngest=rows[0];document.querySelector('[data-stat="young-share"]').textContent=`${one(number(youngest,'ped_share_of_age_pct'))}%`;
 document.querySelector('#young-table tbody').innerHTML=rows.map(d=>`<tr><th>${d['Age group']}</th><td>${number(d,'ped_admissions')}</td><td>${one(number(d,'ped_share_of_age_pct'))}%</td><td>${one(number(d,'ped_admissions_per_100k'))}</td></tr>`).join('');
 const overallShare=100*d3.sum(rows,d=>number(d,'ped_admissions'))/d3.sum(rows,d=>number(d,'Hospitalisations'));let metric='share',highlightAge=new URLSearchParams(location.search).get('age');if(!order.includes(highlightAge))highlightAge=null;const draw=()=>{const w=Math.max(340,host.clientWidth),h=390,m={l:66,r:20,t:30,b:54},key=metric==='share'?'ped_share_of_age_pct':'ped_admissions_per_100k',max=Math.ceil(d3.max(rows,d=>number(d,key))/5)*5;
 const chart=svg(host,'Pedestrian admissions by age',metric==='share'?'Share of all road injury admissions in each age group':'Pedestrian admission rate per 100,000 residents in each age group',w,h),x=d3.scaleBand(order,[m.l,w-m.r]).padding(.25),y=d3.scaleLinear([0,max],[h-m.b,m.t]);
 chart.append('g').attr('class','grid').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickSize(-(w-m.l-m.r)).tickFormat(''));
 chart.append('g').attr('class','axis').attr('transform',`translate(0,${h-m.b})`).call(d3.axisBottom(x));chart.append('g').attr('class','axis').attr('transform',`translate(${m.l},0)`).call(d3.axisLeft(y).ticks(4).tickFormat(v=>metric==='share'?`${v}%`:v));
 if(metric==='share'){chart.append('line').attr('x1',m.l).attr('x2',w-m.r).attr('y1',y(overallShare)).attr('y2',y(overallShare)).attr('stroke',colors.grey).attr('stroke-dasharray','4,4');chart.append('text').attr('x',w-m.r).attr('y',y(overallShare)-8).attr('text-anchor','end').attr('font-size',12).attr('fill','#515c64').text(`All ages ${one(overallShare)}%`);}
 mark(chart.selectAll('rect.age').data(rows,d=>d['Age group']).join('rect').attr('class','age').attr('x',d=>x(d['Age group'])).attr('width',x.bandwidth()).attr('y',d=>y(number(d,key))).attr('height',d=>y(0)-y(number(d,key))).attr('fill',colors.blue).attr('opacity',d=>highlightAge && d['Age group']!==highlightAge?.35:1),d=>metric==='share'?`Age ${d['Age group']}: ${number(d,'ped_admissions')} of ${number(d,'Hospitalisations')} road-injury admissions were pedestrians, ${one(number(d,key))}%`:`Age ${d['Age group']}: ${one(number(d,key))} pedestrian admissions per 100,000 residents`);
 const young=rows.find(d=>d['Age group']==='0-7');document.getElementById('young-announcement').textContent=metric==='share'?`Among ages 0–7, ${one(number(young,'ped_share_of_age_pct'))}% of road-injury admissions involved pedestrians, compared with ${one(overallShare)}% across all ages.`:`The highest admission rate is ${one(d3.max(rows,d=>number(d,'ped_admissions_per_100k')))} per 100,000 residents; this does not adjust for time spent walking.`;
 document.getElementById('young-caption').textContent=metric==='share'?'The percentage is within each age group: pedestrian admissions divided by all road-injury admissions in that age group.':'The rate uses the age-group population as denominator. It does not measure risk per journey or kilometre walked.';
 for(const [id,pressed] of [['share',metric==='share'],['rate',metric==='rate']])document.getElementById(id).setAttribute('aria-pressed',String(pressed));
 };for(const id of ['share','rate'])document.getElementById(id).addEventListener('click',()=>{metric=id;draw();});
 document.addEventListener('agechange',e=>{highlightAge=e.detail?.ageGroup||null;draw();});new ResizeObserver(draw).observe(host);draw();
};
const calculator=async()=>{const rows=await get('age_story_2021.csv',['Age group','ped_bed_days']);const total=group=>d3.sum(rows.filter(d=>group==='all'||(group==='older'?['65-74','75+']:['0-7','8-16','17-25','26-39']).includes(d['Age group'])),d=>number(d,'ped_bed_days'));const render=()=>{const cut=Number(document.getElementById('cut').value),group=document.getElementById('group').value,value=total(group)/365*cut/100;document.getElementById('cut-label').textContent=`${cut}%`;document.getElementById('calculator-result').textContent=`Equivalent to about ${Math.round(value)} fewer occupied beds per day`;document.getElementById('baseline-days').textContent=`${Math.round(total(group)).toLocaleString('en-AU')} bed days`;document.getElementById('remaining-days').textContent=`${Math.round(total(group)*(1-cut/100)).toLocaleString('en-AU')} bed days`;document.getElementById('scenario-fill').style.width=`${100-cut}%`;};document.getElementById('cut').addEventListener('input',render);document.getElementById('group').addEventListener('change',render);render();};
// A11Y: the same exact values appear on pointer hover and keyboard focus; Escape dismisses the tooltip.
function initChartTooltips(){
 const tip=document.createElement('div');tip.className='chart-tooltip';tip.id='chart-tooltip';tip.setAttribute('role','tooltip');tip.hidden=true;document.body.append(tip);
 let hideTimer;const hide=()=>{clearTimeout(hideTimer);tip.hidden=true;};
 const show=mark=>{clearTimeout(hideTimer);const label=mark.getAttribute('aria-label');if(!label)return;tip.textContent=label;tip.hidden=false;const rect=mark.getBoundingClientRect(),height=tip.offsetHeight;tip.style.left=`${Math.max(12,Math.min(rect.left,innerWidth-tip.offsetWidth-12))}px`;tip.style.top=`${rect.bottom+height+12<innerHeight?rect.bottom+8:Math.max(12,rect.top-height-8)}px`;};
 const hit=target=>target?.closest?.('.chart [tabindex]');
 document.addEventListener('pointerover',event=>{const node=hit(event.target);if(node)show(node);});
 document.addEventListener('pointerout',event=>{const node=hit(event.target);if(node&&!tip.contains(event.relatedTarget))hideTimer=setTimeout(()=>{if(!tip.matches(':hover')&&!hit(document.activeElement))hide();},180);});
 document.addEventListener('focusin',event=>{const node=hit(event.target);if(node)show(node);});
 document.addEventListener('focusout',event=>{if(hit(event.target))hide();});
 document.addEventListener('keydown',event=>{if(event.key==='Escape'&&!tip.hidden){hide();event.preventDefault();}});
 tip.addEventListener('pointerenter',()=>clearTimeout(hideTimer));
 tip.addEventListener('pointerleave',()=>{if(!hit(document.activeElement))hide();});
 window.addEventListener('scroll',hide,{passive:true});
}
initChartTooltips();
// A11Y: preference controls use native checkboxes, visible focus, Escape dismissal and focus return.
function initAccessibility() {
 const trigger=document.getElementById('access-trigger'),panel=document.getElementById('access-panel');
 if(!trigger||!panel)return;
 const settings={large:document.getElementById('access-large'),contrast:document.getElementById('access-contrast'),motion:document.getElementById('access-motion')};
 const apply=()=>{
  document.body.classList.toggle('large-text',settings.large.checked);
  document.body.classList.toggle('high-contrast',settings.contrast.checked);
  document.body.classList.toggle('reduce-motion',settings.motion.checked);
  if(settings.motion.checked)window.dispatchEvent(new Event('mtd-reduced-motion'));
  try {localStorage.setItem('mtd-accessibility',JSON.stringify(Object.fromEntries(Object.entries(settings).map(([key,input])=>[key,input.checked]))));} catch (_) { /* Storage can be disabled in private browsing. */ }
  document.getElementById('access-status').textContent='Reading preferences updated.';
 };
 try {const stored=JSON.parse(localStorage.getItem('mtd-accessibility')||'{}');for(const [key,input] of Object.entries(settings))input.checked=!!stored[key];} catch (_) { /* Use defaults when storage is unavailable. */ }
 apply();
 const close=(returnFocus=false)=>{panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(returnFocus)trigger.focus();};
 trigger.addEventListener('click',()=>{const opening=panel.hidden;panel.hidden=!opening;trigger.setAttribute('aria-expanded',String(opening));if(opening){trigger.classList.remove('tooltip-dismissed');settings.large.focus();}else trigger.focus();});
 document.getElementById('access-close').addEventListener('click',()=>close(true));
 document.addEventListener('keydown',event=>{if(event.key!=='Escape')return;if(!panel.hidden){event.preventDefault();close(true);}else if(document.activeElement===trigger){event.preventDefault();trigger.classList.add('tooltip-dismissed');}});
 trigger.addEventListener('blur',()=>trigger.classList.remove('tooltip-dismissed'));
 trigger.addEventListener('pointerleave',()=>trigger.classList.remove('tooltip-dismissed'));
 document.addEventListener('pointerdown',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target))close();});
 document.addEventListener('focusin',event=>{if(!panel.hidden&&!panel.contains(event.target)&&!trigger.contains(event.target))close();});
 for(const input of Object.values(settings))input.addEventListener('change',apply);
 document.getElementById('access-reset').addEventListener('click',()=>{for(const input of Object.values(settings))input.checked=false;apply();settings.large.focus();});
 document.getElementById('access-table').addEventListener('click',()=>{const details=document.querySelector('.panel details');if(!details)return;details.open=true;close();details.querySelector('summary').focus();details.scrollIntoView({block:'nearest',behavior:'auto'});});
}
const page=document.body.dataset.page;const run=page==='story-winter'?winter:page==='story-young'?young:page==='what-can-be-done'?calculator:null;
if(run)run().catch(e=>{console.error(e);document.getElementById('error').hidden=false;});
})();
