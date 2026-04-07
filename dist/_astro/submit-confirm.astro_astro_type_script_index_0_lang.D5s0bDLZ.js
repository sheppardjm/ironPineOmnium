function f(e){let t=e.replace(/-/g,"+").replace(/_/g,"/");for(;t.length%4;)t+="=";return JSON.parse(atob(t))}function d(e){const t=Math.floor(e/3600),s=Math.floor(e%3600/60),i=e%60;return[t,s,i].map(r=>String(r).padStart(2,"0")).join(":")}function g(e){const t=document.getElementById("athlete-identity");if(t){const n=(e.athleteFirstname??"").trim(),c=(e.athleteLastname??"").trim(),o=[n,c].filter(Boolean).join(" ");o?t.textContent="Connected as "+o:t.textContent="Connected as Athlete #"+(e.athleteId??"unknown")}const s=document.getElementById("activity-date");if(s){const n=e.startDateLocal??"";n.startsWith("2026-06-06")?s.textContent="Day 1 — Saturday, June 6":n.startsWith("2026-06-07")?s.textContent="Day 2 — Sunday, June 7":s.textContent=n?n.slice(0,10):""}const i=document.getElementById("day1-preview");if(i){const n=e.movingTimeSeconds??0;n>0?i.innerHTML=`
            <p class="preview-label">Day 1 · Moving Time</p>
            <p class="preview-value">${d(n)}</p>
            <p class="preview-explain">Your moving time counts for <strong>35%</strong> of your overall score, benchmarked against the fastest rider in your category.</p>
          `:i.innerHTML=`
            <p class="preview-label">Day 1 · Moving Time</p>
            <p class="preview-value">—</p>
            <p class="preview-explain">Not applicable for Day 2 activities.</p>
          `}const r=document.getElementById("sectors-preview");if(r){const n=e.sectorEfforts??{},c=Object.keys(n).length,o=Object.values(n).reduce((a,m)=>a+m,0);c>0?r.innerHTML=`
            <p class="preview-label">Day 2 · Timed Sectors</p>
            <p class="preview-value">${c} of 7 sectors · ${d(o)}</p>
            <p class="preview-explain">Your combined sector time counts for <strong>45%</strong> of your overall score, benchmarked against the fastest aggregate in your category.</p>
          `:e.startDateLocal==="2026-06-07"?r.innerHTML=`
              <div class="zero-match-warning">
                <p class="preview-label">Day 2 · Timed Sectors</p>
                <p class="preview-value warning-value">0 of 7 sectors matched</p>
                <p class="preview-explain warning-explain">This activity had no recognized timed sectors. Your Day 2 sector score will be zero (45% of your overall score). This is unusual — double-check that you submitted the correct MK Ultra Gravel activity.</p>
              </div>
            `:r.innerHTML=`
              <p class="preview-label">Day 2 · Timed Sectors</p>
              <p class="preview-value">—</p>
              <p class="preview-explain">Not applicable for Day 1 activities.</p>
            `}const l=document.getElementById("kom-preview");if(l){const n=(e.komSegmentIds??[]).length,c=e.komEfforts??{},o=Object.values(c).reduce((a,m)=>a+m,0);if(n>0){const a=o>0?` · ${d(o)} total climb time`:"";l.innerHTML=`
            <p class="preview-label">Day 2 · KOM Points</p>
            <p class="preview-value">${n} of 3 KOM segments${a}</p>
            <p class="preview-explain">KOM points count for <strong>20%</strong> of your overall score, based on how your climb times compare to other riders.</p>
          `}else e.startDateLocal==="2026-06-07"?l.innerHTML=`
              <div class="zero-match-warning">
                <p class="preview-label">Day 2 · KOM Points</p>
                <p class="preview-value warning-value">0 of 3 KOM segments matched</p>
                <p class="preview-explain warning-explain">No KOM climb segments were found in this activity. Your KOM score will be zero (20% of your overall score).</p>
              </div>
            `:l.innerHTML=`
              <p class="preview-label">Day 2 · KOM Points</p>
              <p class="preview-value">—</p>
              <p class="preview-explain">Not applicable for Day 1 activities.</p>
            `}}function v(e){const t=(s,i)=>{const r=document.getElementById(s);r&&(r.value=typeof i=="object"?JSON.stringify(i):String(i??""))};t("h-activityId",e.activityId),t("h-athleteId",e.athleteId),t("h-movingTimeSeconds",e.movingTimeSeconds),t("h-startDateLocal",e.startDateLocal),t("h-sectorEfforts",e.sectorEfforts??{}),t("h-komSegmentIds",e.komSegmentIds??[]),t("h-komEfforts",e.komEfforts??{}),t("h-athleteFirstname",e.athleteFirstname),t("h-athleteLastname",e.athleteLastname)}function y(){document.getElementById("confirm-form").addEventListener("submit",async t=>{t.preventDefault();const s=document.getElementById("rider-name"),i=document.getElementById("rider-category"),r=s.value.trim(),l=i.value;if(s.setCustomValidity(""),i.setCustomValidity(""),!r){s.setCustomValidity("Please enter your display name."),s.reportValidity();return}if(!l){i.setCustomValidity("Please select your category."),i.reportValidity();return}const n=document.getElementById("confirm-btn");n.textContent="Submitting...",n.disabled=!0;const c=document.getElementById("confirm-form"),o=new FormData(c),a={name:r,category:l,activityId:o.get("activityId"),athleteId:o.get("athleteId"),movingTimeSeconds:Number(o.get("movingTimeSeconds")),startDateLocal:o.get("startDateLocal"),sectorEfforts:JSON.parse(o.get("sectorEfforts")||"{}"),komSegmentIds:JSON.parse(o.get("komSegmentIds")||"[]"),komEfforts:JSON.parse(o.get("komEfforts")||"{}")};try{const p=await(await fetch("/api/submit-result",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(a),credentials:"include"})).json();if(p.ok){window.location.href="/?submitted=true";return}n.textContent="Confirm Submission",n.disabled=!1;const u={athlete_mismatch:"Session mismatch — please sign in again.",invalid_payload:"Missing required fields. Please try again.",invalid_date:"Activity date is outside the event window.",write_conflict:"Temporary conflict — please try again.",github_error:"Server error — please try again in a moment.",github_write_error:"Failed to save — please try again."}[p.error]||"Something went wrong. Please try again.";alert(u)}catch{n.textContent="Confirm Submission",n.disabled=!1,alert("Network error — please check your connection and try again.")}}),document.getElementById("rider-name").addEventListener("input",function(){this.setCustomValidity("")}),document.getElementById("rider-category").addEventListener("change",function(){this.setCustomValidity("")})}document.addEventListener("DOMContentLoaded",()=>{const t=new URLSearchParams(window.location.search).get("payload");if(!t){window.location.href="/submit";return}let s;try{s=f(t)}catch{window.location.href="/submit";return}g(s),v(s),y()});
