// ===================================================================
// JobPulse AI - Core Frontend Logic
// ===================================================================

let currentProfile = null;
let allTrackedJobs = [];
let lastGeneratedTexFilename = "Resume_CV.tex";
let lastGeneratedPdfFilename = null;
let activeOutreachContact = null;

document.addEventListener('DOMContentLoaded', () => {
  initNavTabs();
  initStats();
  initDiscoveryForms();
  initCompanySearch();
  initPipeline();
  initContactsTab();
  initLatexStudio();
  initAiInspector();
  initSettings();
  initModal();
  initOutreachModal();
});

// --- Toast System ---
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  
  let icon = 'ℹ️';
  if (type === 'success') icon = '✅';
  if (type === 'error') icon = '⚠️';
  
  toast.innerHTML = `<span>${icon}</span><span>${message}</span>`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 250);
  }, 4000);
}

// --- Navigation Tabs ---
function initNavTabs() {
  const navBtns = document.querySelectorAll('.nav-tab-btn');
  const panes = document.querySelectorAll('.tab-pane');

  navBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.dataset.tab;
      navBtns.forEach(b => b.classList.remove('active'));
      panes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (targetId === 'tab-pipeline') loadPipeline();
      if (targetId === 'tab-latex') loadProfileAndJobsForCv();
    });
  });
}

function switchTab(tabId) {
  const btn = document.querySelector(`.nav-tab-btn[data-tab="${tabId}"]`);
  if (btn) btn.click();
}

// --- Stats ---
async function initStats() {
  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success) {
      document.getElementById('stat-total').innerText = data.stats.total || 0;
      document.getElementById('stat-wishlist').innerText = data.stats.wishlist || 0;
      document.getElementById('stat-applied').innerText = data.stats.applied || 0;
      document.getElementById('stat-interviewing').innerText = data.stats.interviewing || 0;
      document.getElementById('stat-offers').innerText = data.stats.offer || 0;
    }
  } catch (err) {
    console.error("Failed to load stats:", err);
  }
}

// --- Tab 1: Discovery (LinkedIn & Google) ---
function initDiscoveryForms() {
  const liForm = document.getElementById('form-linkedin-scrape');
  const googleForm = document.getElementById('form-google-scrape');
  const clearBtn = document.getElementById('btn-clear-discovery');
  const liQueryInput = document.getElementById('li-search-query');
  const liPill = document.getElementById('li-url-detection-pill');
  const liMeta = document.getElementById('li-detected-meta');

  // Live detection for authenticated LinkedIn URLs
  if (liQueryInput && liPill) {
    const detectAuthUrl = () => {
      const val = liQueryInput.value.trim();
      if (val.startsWith('http') && val.includes('linkedin.com')) {
        try {
          const u = new URL(val);
          const currentJobId = u.searchParams.get('currentJobId');
          const kw = u.searchParams.get('keywords');
          const loc = u.searchParams.get('location');
          const fTpr = u.searchParams.get('f_TPR');
          const fWt = u.searchParams.get('f_WT');

          const tags = [];
          if (currentJobId) tags.push(`🎯 Active Job: #${currentJobId}`);
          if (kw) tags.push(`Keywords: "${kw}"`);
          if (loc) {
            tags.push(`📍 ${loc}`);
            const locInput = document.getElementById('li-location');
            if (locInput) locInput.value = loc;
          }
          if (fTpr) tags.push(`Date Filter: ${fTpr}`);
          if (fWt) tags.push(`Work Type: ${fWt}`);

          if (liMeta) liMeta.innerText = tags.join(' • ') || 'Authenticated session filters detected';
          liPill.style.display = 'block';
        } catch (err) {
          liPill.style.display = 'none';
        }
      } else {
        liPill.style.display = 'none';
      }
    };

    liQueryInput.addEventListener('input', detectAuthUrl);
    liQueryInput.addEventListener('paste', () => setTimeout(detectAuthUrl, 50));
  }

  liForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const query = document.getElementById('li-search-query').value.trim();
    const location = document.getElementById('li-location').value.trim();
    const maxResults = document.getElementById('li-max-results').value;
    const findSites = document.getElementById('li-find-company-sites').checked;
    const cookieInput = document.getElementById('li-session-cookie');
    const cookie = cookieInput ? cookieInput.value.trim() : '';

    const btn = document.getElementById('btn-scrape-linkedin');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> <span>Extracting LinkedIn Postings...</span>`;
    btn.disabled = true;

    try {
      showToast(query.startsWith('http') ? "Scraping authenticated LinkedIn search URL..." : "Searching LinkedIn job postings...", "info");
      const res = await fetch('/api/scrape/linkedin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          location,
          max_results: maxResults,
          auto_save: true,
          find_company_sites: findSites,
          cookie: cookie
        })
      });
      const data = await res.json();
      if (data.success) {
        if (data.parsed_url && data.parsed_url.current_job_id) {
          showToast(`Discovered & saved active Job #${data.parsed_url.current_job_id} + ${data.count - 1} search results!`, "success");
        } else {
          showToast(`Discovered and saved ${data.count} LinkedIn jobs!`, "success");
        }
        renderDiscoveryCards(data.jobs);
        initStats();
      } else {
        showToast(data.error || "Failed scraping LinkedIn", "error");
      }
    } catch (err) {
      showToast("Network error scraping LinkedIn", "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  googleForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const role = document.getElementById('google-role').value.trim();
    const location = document.getElementById('google-location').value.trim();
    const experience = document.getElementById('google-exp').value;
    const workType = document.getElementById('google-work-type').value;
    const keywords = document.getElementById('google-keywords').value.trim();
    const atsOnly = document.getElementById('google-ats-only').checked;

    const btn = document.getElementById('btn-scrape-google');
    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> <span>Searching Google ATS Portals...</span>`;
    btn.disabled = true;

    try {
      showToast("Executing Google search and ATS dorking...", "info");
      const res = await fetch('/api/scrape/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role, location, experience, work_type: workType,
          keywords, ats_only: atsOnly, max_results: 12, auto_save: true
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Discovered ${data.count} direct opportunities!`, "success");
        renderDiscoveryCards(data.jobs);
        initStats();
      } else {
        showToast(data.error || "Failed searching Google", "error");
      }
    } catch (err) {
      showToast("Network error searching Google", "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  clearBtn.addEventListener('click', () => {
    document.getElementById('discovery-feed-container').innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div>🎯 Start a search above using a LinkedIn URL or Google Role & Location to discover jobs!</div>
      </div>
    `;
    document.getElementById('discovery-count').innerText = '0';
  });

  initBengaluruChips();
}

function initBengaluruChips() {
  const locContainer = document.getElementById('chips-location-container');
  const roleContainer = document.getElementById('chips-role-container');
  const liQueryInput = document.getElementById('li-search-query');
  const liLocInput = document.getElementById('li-location');
  const googleRoleInput = document.getElementById('google-role');
  const googleLocInput = document.getElementById('google-location');
  const quickSearchBtn = document.getElementById('btn-quick-bengaluru-search');

  // Multi-option roles chip selection
  if (roleContainer) {
    roleContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      chip.classList.toggle('active');

      const activeChips = roleContainer.querySelectorAll('.filter-chip.active');
      const selectedRoles = Array.from(activeChips).map(c => c.dataset.role).filter(Boolean);
      const roleQueryStr = selectedRoles.join(', ');

      if (liQueryInput) liQueryInput.value = roleQueryStr || 'Full Stack Developer';
      if (googleRoleInput) googleRoleInput.value = roleQueryStr || 'Full Stack Developer';
    });
  }

  // Multi-option locations & hubs selection
  if (locContainer) {
    locContainer.addEventListener('click', (e) => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;

      const isDefaultAll = chip.dataset.loc === 'Bengaluru, Karnataka, India';

      if (isDefaultAll) {
        // Reset all specific chips, activate All Bengaluru
        locContainer.querySelectorAll('.filter-chip').forEach(c => {
          c.classList.remove('active', 'active-bengaluru');
        });
        chip.classList.add('active-bengaluru');
      } else {
        // Toggle specific hub chip
        chip.classList.toggle('active-bengaluru');
        const allChip = locContainer.querySelector('[data-loc="Bengaluru, Karnataka, India"]');
        if (allChip) allChip.classList.remove('active-bengaluru');

        const activeChips = locContainer.querySelectorAll('.filter-chip.active-bengaluru');
        if (activeChips.length === 0 && allChip) {
          allChip.classList.add('active-bengaluru');
        }
      }

      const activeLocChips = locContainer.querySelectorAll('.filter-chip.active-bengaluru');
      const selectedLocs = Array.from(activeLocChips).map(c => c.dataset.loc).filter(Boolean);
      const locQueryStr = selectedLocs.length > 0 ? selectedLocs.join(', ') : 'Bengaluru, Karnataka, India';

      if (liLocInput) liLocInput.value = selectedLocs.length === 1 ? selectedLocs[0] : 'Bengaluru, Karnataka, India';
      if (googleLocInput) googleLocInput.value = locQueryStr;
    });
  }

  // Quick Search Bengaluru Jobs button (concurrent multi-portal pipeline)
  if (quickSearchBtn) {
    quickSearchBtn.addEventListener('click', async () => {
      const activeRoleChips = roleContainer ? roleContainer.querySelectorAll('.filter-chip.active') : [];
      const selectedRoles = Array.from(activeRoleChips).map(c => c.dataset.role).filter(Boolean);
      const roleQuery = selectedRoles.join(', ') || (liQueryInput ? liQueryInput.value : 'Full Stack Developer, Python Developer');

      const activeLocChips = locContainer ? locContainer.querySelectorAll('.filter-chip.active-bengaluru') : [];
      const selectedLocs = Array.from(activeLocChips).map(c => c.dataset.loc).filter(Boolean);
      const locQuery = selectedLocs.length > 0 ? selectedLocs[0] : 'Bengaluru, Karnataka, India';

      const origHtml = quickSearchBtn.innerHTML;
      quickSearchBtn.innerHTML = `<span class="spinner"></span> <span>Scraping Bengaluru Portals...</span>`;
      quickSearchBtn.disabled = true;

      showToast(`⚡ Searching Bengaluru tech ecosystem for: ${roleQuery}...`, "info");

      try {
        const [liRes, googleRes] = await Promise.allSettled([
          fetch('/api/scrape/linkedin', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              query: roleQuery,
              location: locQuery,
              max_results: 15,
              auto_save: true,
              find_company_sites: true
            })
          }).then(r => r.json()),
          fetch('/api/scrape/google', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              role: roleQuery,
              location: locQuery,
              ats_only: true,
              max_results: 15,
              auto_save: true
            })
          }).then(r => r.json())
        ]);

        let combinedJobs = [];
        let seenUrls = new Set();

        if (googleRes.status === 'fulfilled' && googleRes.value && googleRes.value.success && Array.isArray(googleRes.value.jobs)) {
          googleRes.value.jobs.forEach(j => {
            if (j.job_url && !seenUrls.has(j.job_url)) {
              seenUrls.add(j.job_url);
              combinedJobs.push(j);
            }
          });
        }

        if (liRes.status === 'fulfilled' && liRes.value && liRes.value.success && Array.isArray(liRes.value.jobs)) {
          liRes.value.jobs.forEach(j => {
            if (j.job_url && !seenUrls.has(j.job_url)) {
              seenUrls.add(j.job_url);
              combinedJobs.push(j);
            }
          });
        }

        // Sort by ATS match score descending
        combinedJobs.sort((a, b) => (b.match_score || 0) - (a.match_score || 0));

        renderDiscoveryCards(combinedJobs);
        initStats();

        showToast(`Discovered & ranked ${combinedJobs.length} Bengaluru jobs across direct ATS & LinkedIn!`, "success");
      } catch (err) {
        console.error("Quick Bengaluru search error:", err);
        showToast("Error executing quick Bengaluru search", "error");
      } finally {
        quickSearchBtn.innerHTML = origHtml;
        quickSearchBtn.disabled = false;
      }
    });
  }
}


function renderDiscoveryCards(jobs) {
  const container = document.getElementById('discovery-feed-container');
  document.getElementById('discovery-count').innerText = jobs.length;

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No job postings found matching this query. Try broader keywords.</div>`;
    return;
  }

  container.innerHTML = jobs.map(job => {
    const skillsHtml = (job.skills || []).map(s => `<span class="skill-tag">${escapeHtml(s)}</span>`).join('');
    const matchScore = job.match_score ? `${Math.round(job.match_score)}% Match` : 'ATS Ready';
    
    return `
      <div class="job-card" id="card-${job.id}">
        <div class="job-card-top">
          <div>
            <a href="${escapeHtml(job.job_url || '#')}" target="_blank" class="job-title-link">
              ${escapeHtml(job.title)}
            </a>
            <div class="job-meta-row">
              <span class="job-company">${escapeHtml(job.company)}</span>
              <span>•</span>
              <span>📍 ${escapeHtml(job.location || 'Remote/Unspecified')}</span>
              ${job.posted_date ? `<span>• 🕒 ${escapeHtml(job.posted_date)}</span>` : ''}
              <span class="badge badge-source">${escapeHtml(job.source || 'Scraper')}</span>
              ${job.ats_provider ? `<span class="badge badge-ats">⚡ ${escapeHtml(job.ats_provider)}</span>` : ''}
            </div>
          </div>
          <span class="badge badge-match">${matchScore}</span>
        </div>

        ${job.description ? `<div style="font-size: 0.85rem; color: var(--text-secondary); max-height: 60px; overflow: hidden; text-overflow: ellipsis;">${escapeHtml(job.description.slice(0, 200))}...</div>` : ''}

        <div class="skills-pill-container">${skillsHtml}</div>

        <div class="job-card-actions">
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            ${job.career_page_url ? `
              <a href="${escapeHtml(job.career_page_url)}" target="_blank" class="btn btn-secondary btn-sm" title="Open official company careers portal">
                🏢 Career Portal ↗
              </a>` : ''}
            <button class="btn btn-secondary btn-sm" onclick="tailorForJob('${job.id}')" title="Tailor LaTeX CV for this job">
              📄 Tailor CV
            </button>
            <button class="btn btn-secondary btn-sm" onclick="inspectJobAi('${job.id}')" title="Analyze JD with AI">
              🤖 Inspect JD
            </button>
            <button class="btn btn-secondary btn-sm" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR, recruiters & referral contacts">
              👥 Find HR
            </button>
          </div>

          <div class="action-buttons-group">
            <button class="btn btn-primary btn-sm" onclick="applyJob('${job.id}', '${encodeURIComponent(job.career_page_url || job.job_url)}')">
              ⚡ 1-Click Apply
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// 1-Click Apply Handler
async function applyJob(jobId, encodedUrl) {
  const url = decodeURIComponent(encodedUrl);
  if (url && url !== '#') {
    window.open(url, '_blank');
  }
  
  try {
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Applied' })
    });
    const data = await res.json();
    if (data.success) {
      showToast("Opened application page & updated status to 'Applied'!", "success");
      initStats();
      const card = document.getElementById(`card-${jobId}`);
      if (card) {
        const applyBtn = card.querySelector('.btn-primary');
        if (applyBtn) {
          applyBtn.className = "btn btn-success btn-sm";
          applyBtn.innerText = "✓ Applied";
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
}

// --- Tab 2: Company Career Sites ---
function initCompanySearch() {
  const form = document.getElementById('form-company-search');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = document.getElementById('company-search-name').value.trim();
    const website = document.getElementById('company-search-web').value.trim();

    try {
      showToast(`Searching careers portal for ${company}...`, "info");
      const res = await fetch('/api/scrape/company', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company, website })
      });
      const data = await res.json();
      if (data.success && data.company_info) {
        renderCompanyResult(data.company_info);
      }
    } catch (err) {
      showToast("Failed to find company career portal", "error");
    }
  });
}

function renderCompanyResult(info) {
  const box = document.getElementById('company-search-result-box');
  box.style.display = 'block';
  box.innerHTML = `
    <div class="job-card" style="border-color: var(--accent-primary);">
      <div class="job-card-top">
        <div>
          <div class="job-company" style="font-size: 1.2rem;">🏢 ${escapeHtml(info.company)}</div>
          <div class="job-meta-row">
            ${info.official_site ? `<span>🌐 <a href="${escapeHtml(info.official_site)}" target="_blank" style="color: var(--accent-cyan);">${escapeHtml(info.official_site)}</a></span>` : ''}
            <span>•</span>
            <span class="badge badge-ats">ATS: ${escapeHtml(info.ats_provider)}</span>
          </div>
        </div>
      </div>
      <div style="font-size: 0.9rem; color: var(--text-secondary); margin: 0.5rem 0;">
        Found official career portal link. You can browse live openings directly on their hiring system.
      </div>
      <div class="job-card-actions">
        <a href="${escapeHtml(info.career_page_url)}" target="_blank" class="btn btn-primary">
          🚀 Open Official Careers Page ↗
        </a>
      </div>
    </div>
  `;
}

// --- Tab 3: Pipeline & Kanban ---
async function initPipeline() {
  document.getElementById('btn-refresh-pipeline').addEventListener('click', loadPipeline);
  document.getElementById('pipeline-filter-status').addEventListener('change', loadPipeline);
  document.getElementById('pipeline-search-input').addEventListener('input', debounce(loadPipeline, 300));
  
  const pushSheetsBtn = document.getElementById('btn-pipeline-sync-sheets');
  pushSheetsBtn.addEventListener('click', syncSheets);
  document.getElementById('btn-sync-sheets').addEventListener('click', syncSheets);
}

async function loadPipeline() {
  const status = document.getElementById('pipeline-filter-status').value;
  const search = document.getElementById('pipeline-search-input').value.trim();

  try {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);

    const res = await fetch(`/api/jobs?${params.toString()}`);
    const data = await res.json();
    if (data.success) {
      allTrackedJobs = data.jobs;
      renderKanban(data.jobs);
      initStats();
    }
  } catch (err) {
    console.error("Failed to load pipeline:", err);
  }
}

function renderKanban(jobs) {
  const columns = {
    'Wishlist': document.getElementById('kanban-col-wishlist'),
    'Applied': document.getElementById('kanban-col-applied'),
    'Interviewing': document.getElementById('kanban-col-interviewing'),
    'Offer': document.getElementById('kanban-col-offer'),
    'Rejected': document.getElementById('kanban-col-rejected')
  };

  const counts = { Wishlist: 0, Applied: 0, Interviewing: 0, Offer: 0, Rejected: 0 };

  // Clear columns
  Object.values(columns).forEach(col => col.innerHTML = '');

  jobs.forEach(job => {
    const st = job.status || 'Wishlist';
    if (columns[st]) {
      counts[st]++;
      const card = document.createElement('div');
      card.className = 'kanban-item';
      card.id = `kanban-item-${job.id}`;
      card.innerHTML = `
        <div class="kanban-item-title">${escapeHtml(job.title)}</div>
        <div class="kanban-item-company">${escapeHtml(job.company)}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted); margin-bottom: 0.5rem;">
          📍 ${escapeHtml(job.location || 'Remote')}
          ${job.applied_date ? `<br>📅 ${escapeHtml(job.applied_date)}` : ''}
        </div>
        <div style="display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 0.5rem;">
          <select class="form-select" style="padding: 0.2rem 0.4rem; font-size: 0.75rem; width: auto;" onchange="changeJobStatus('${job.id}', this.value)">
            <option value="Wishlist" ${st === 'Wishlist' ? 'selected' : ''}>🌟 Wishlist</option>
            <option value="Applied" ${st === 'Applied' ? 'selected' : ''}>🚀 Applied</option>
            <option value="Interviewing" ${st === 'Interviewing' ? 'selected' : ''}>💬 Interview</option>
            <option value="Offer" ${st === 'Offer' ? 'selected' : ''}>🏆 Offer</option>
            <option value="Rejected" ${st === 'Rejected' ? 'selected' : ''}>❌ Rejected</option>
          </select>
          <div style="display: flex; gap: 0.3rem;">
            <button class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.4rem;" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR, recruiters & referral contacts">👥</button>
            ${job.career_page_url || job.job_url ? `
              <a href="${escapeHtml(job.career_page_url || job.job_url)}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.4rem;" title="Open application link">↗</a>` : ''}
            <button class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.4rem; color: var(--accent-rose);" onclick="deleteJob('${job.id}')" title="Delete">🗑</button>
          </div>
        </div>
      `;
      columns[st].appendChild(card);
    }
  });

  document.getElementById('count-wishlist').innerText = counts.Wishlist;
  document.getElementById('count-applied').innerText = counts.Applied;
  document.getElementById('count-interviewing').innerText = counts.Interviewing;
  document.getElementById('count-offer').innerText = counts.Offer;
  document.getElementById('count-rejected').innerText = counts.Rejected;
}

async function changeJobStatus(jobId, newStatus) {
  try {
    const res = await fetch(`/api/jobs/${jobId}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Status updated to ${newStatus}`, "success");
      loadPipeline();
    }
  } catch (err) {
    showToast("Failed to update status", "error");
  }
}

async function deleteJob(jobId) {
  if (!confirm("Are you sure you want to remove this job?")) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast("Job removed from tracker", "info");
      loadPipeline();
    }
  } catch (err) {
    showToast("Failed to delete job", "error");
  }
}

async function syncSheets() {
  try {
    showToast("Syncing tracked jobs with Google Sheets...", "info");
    const res = await fetch('/api/sheets/sync', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast(data.message, "success");
    } else {
      showToast(data.message || "Google Sheets sync failed. Check creds.json", "error");
    }
  } catch (err) {
    showToast("Error connecting to Google Sheets endpoint", "error");
  }
}

// --- Tab 4: LaTeX CV Studio ---
async function initLatexStudio() {
  document.getElementById('btn-save-profile').addEventListener('click', saveCurrentProfile);
  document.getElementById('btn-generate-latex').addEventListener('click', () => generateCv(false));
  document.getElementById('btn-ai-tailor-latex').addEventListener('click', () => generateCv(true));
  
  document.getElementById('btn-copy-latex').addEventListener('click', () => {
    const code = document.getElementById('latex-code-output').value;
    if (!code) return;
    navigator.clipboard.writeText(code);
    showToast("LaTeX code copied to clipboard!", "success");
  });

  document.getElementById('btn-download-tex').addEventListener('click', () => {
    window.location.href = `/api/latex/download/${lastGeneratedTexFilename}`;
  });

  document.getElementById('btn-download-pdf').addEventListener('click', () => {
    if (lastGeneratedPdfFilename) {
      window.location.href = `/api/latex/download/${lastGeneratedPdfFilename}`;
    } else {
      showToast("PDF compiler (pdflatex) not found locally. Click 'Open Overleaf' to compile online!", "info");
    }
  });

  // Pre-load default template
  loadProfileAndJobsForCv();
}

async function loadProfileAndJobsForCv() {
  try {
    const res = await fetch('/api/profile');
    const data = await res.json();
    if (data.success && data.profile) {
      currentProfile = data.profile;
      populateProfileForm(data.profile);
    }

    // Populate job selector
    const jobsRes = await fetch('/api/jobs');
    const jobsData = await jobsRes.json();
    if (jobsData.success) {
      const select = document.getElementById('select-job-for-cv');
      select.innerHTML = '<option value="">-- Use Standard Master Profile --</option>';
      jobsData.jobs.forEach(j => {
        select.innerHTML += `<option value="${j.id}">${escapeHtml(j.title)} @ ${escapeHtml(j.company)}</option>`;
      });
    }
  } catch (err) {
    console.error("Error loading CV data:", err);
  }
}

function populateProfileForm(p) {
  document.getElementById('profile-name').value = p.name || '';
  document.getElementById('profile-title').value = p.title || '';
  document.getElementById('profile-email').value = p.email || '';
  document.getElementById('profile-phone').value = p.phone || '';
  document.getElementById('profile-linkedin').value = p.linkedin || '';
  document.getElementById('profile-github').value = p.github || '';
  document.getElementById('profile-location').value = p.location || '';
  document.getElementById('profile-summary').value = p.summary || '';

  // Format skills
  if (p.skills && typeof p.skills === 'object') {
    const skillLines = Object.entries(p.skills).map(([k, v]) => `${k}: ${Array.isArray(v) ? v.join(', ') : v}`).join('\n');
    document.getElementById('profile-skills-raw').value = skillLines;
  }
}

function readProfileFromForm() {
  const p = currentProfile ? { ...currentProfile } : {};
  p.name = document.getElementById('profile-name').value;
  p.title = document.getElementById('profile-title').value;
  p.email = document.getElementById('profile-email').value;
  p.phone = document.getElementById('profile-phone').value;
  p.linkedin = document.getElementById('profile-linkedin').value;
  p.github = document.getElementById('profile-github').value;
  p.location = document.getElementById('profile-location').value;
  p.summary = document.getElementById('profile-summary').value;

  const rawSkills = document.getElementById('profile-skills-raw').value;
  const skillsObj = {};
  rawSkills.split('\n').forEach(line => {
    if (line.includes(':')) {
      const [k, v] = line.split(':');
      skillsObj[k.trim()] = v.split(',').map(s => s.trim()).filter(Boolean);
    }
  });
  if (Object.keys(skillsObj).length > 0) {
    p.skills = skillsObj;
  }
  return p;
}

async function saveCurrentProfile() {
  const profile = readProfileFromForm();
  currentProfile = profile;
  try {
    const res = await fetch('/api/profile', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(profile)
    });
    const data = await res.json();
    if (data.success) {
      showToast("Candidate profile saved successfully!", "success");
    }
  } catch (err) {
    showToast("Failed to save profile", "error");
  }
}

async function generateCv(withAiTailor = false) {
  const profile = readProfileFromForm();
  currentProfile = profile;
  const selectedJobId = document.getElementById('select-job-for-cv').value;

  let selectedJob = null;
  if (selectedJobId) {
    const jobRes = await fetch(`/api/jobs/${selectedJobId}`);
    const jobData = await jobRes.json();
    if (jobData.success) selectedJob = jobData.job;
  }

  showToast(withAiTailor ? "Generating AI-tailored STAR bullet points & LaTeX..." : "Generating ATS-optimized LaTeX CV...", "info");

  try {
    let res, data;
    if (withAiTailor && selectedJob) {
      res = await fetch('/api/ai/tailor-cv', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ job_data: selectedJob })
      });
      data = await res.json();
      if (data.success) {
        document.getElementById('latex-code-output').value = data.latex_result.latex_code;
        lastGeneratedTexFilename = data.latex_result.tex_filename;
        setupOverleafAndStatus(data.latex_result);
        showToast(`CV tailored with ${data.match.score}% ATS keyword alignment!`, "success");
      }
    } else {
      res = await fetch('/api/latex/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile, job_data: selectedJob })
      });
      data = await res.json();
      if (data.success) {
        document.getElementById('latex-code-output').value = data.result.latex_code;
        lastGeneratedTexFilename = data.result.tex_filename;
        setupOverleafAndStatus(data.result);
        showToast("LaTeX CV generated successfully!", "success");
      }
    }
  } catch (err) {
    showToast("Error generating CV", "error");
  }
}

function setupOverleafAndStatus(result) {
  const indicator = document.getElementById('compiler-status-indicator');
  const overleafBtn = document.getElementById('btn-open-overleaf');
  
  if (result.pdf_compiled) {
    lastGeneratedPdfFilename = result.tex_filename.replace('.tex', '.pdf');
    indicator.innerHTML = `<span style="color: var(--accent-emerald);">✓ PDF Compiled Locally: Ready for Download</span>`;
  } else {
    lastGeneratedPdfFilename = null;
    indicator.innerHTML = `<span>💡 ATS-Compliant .tex ready. Click <b>Open Overleaf</b> for 1-click cloud PDF compiling!</span>`;
  }

  // Set Overleaf link or form
  overleafBtn.onclick = (e) => {
    e.preventDefault();
    openInOverleaf(result.latex_code);
  };
}

function openInOverleaf(latexCode) {
  // Use Overleaf's direct document creation form POST
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = 'https://www.overleaf.com/docs';
  form.target = '_blank';

  const input = document.createElement('input');
  input.type = 'hidden';
  input.name = 'snip';
  input.value = latexCode;

  form.appendChild(input);
  document.body.appendChild(form);
  form.submit();
  form.remove();
}

function tailorForJob(jobId) {
  switchTab('tab-latex');
  setTimeout(() => {
    const select = document.getElementById('select-job-for-cv');
    if (select) {
      select.value = jobId;
      generateCv(true);
    }
  }, 200);
}

// --- Tab 5: AI JD Inspector & Outreach ---
function initAiInspector() {
  const btn = document.getElementById('btn-analyze-jd');
  btn.addEventListener('click', async () => {
    const jdText = document.getElementById('ai-jd-input').value.trim();
    if (!jdText) {
      showToast("Please paste a job description first!", "error");
      return;
    }

    const originalText = btn.innerHTML;
    btn.innerHTML = `<span class="spinner"></span> <span>Analyzing with ATS Engine...</span>`;
    btn.disabled = true;

    try {
      showToast("Extracting skills, ATS keywords & match score...", "info");
      const res = await fetch('/api/ai/analyze-jd', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ jd_text: jdText })
      });
      const data = await res.json();
      if (data.success) {
        renderAiAnalysis(data.analysis, data.match);
        // Also fetch cold outreach
        generateOutreachForJd(data.analysis);
      } else {
        showToast(data.error || "Analysis failed", "error");
      }
    } catch (err) {
      showToast("Error communicating with AI engine", "error");
    } finally {
      btn.innerHTML = originalText;
      btn.disabled = false;
    }
  });

  document.getElementById('btn-copy-linkedin-msg').addEventListener('click', () => {
    const txt = document.getElementById('outreach-linkedin-text').value;
    navigator.clipboard.writeText(txt);
    showToast("LinkedIn message copied!", "success");
  });

  document.getElementById('btn-copy-email-msg').addEventListener('click', () => {
    const txt = document.getElementById('outreach-email-text').value;
    navigator.clipboard.writeText(txt);
    showToast("Cover letter copied!", "success");
  });
}

function renderAiAnalysis(analysis, match) {
  const scoreBadge = document.getElementById('ats-score-badge');
  scoreBadge.innerText = `Score: ${match.score}%`;
  scoreBadge.className = match.score >= 75 ? 'badge badge-offer' : 'badge badge-interview';

  const output = document.getElementById('ai-analysis-output');
  output.innerHTML = `
    <div style="margin-bottom: 1rem;">
      <div style="font-size: 1.1rem; font-weight: 700; color: #fff;">${escapeHtml(analysis.role)}</div>
      <div style="font-size: 0.85rem; color: var(--accent-cyan);">${escapeHtml(analysis.experience_level || 'Mid Level')}</div>
      ${analysis.summary ? `<p style="margin-top: 0.5rem; font-size: 0.85rem; line-height: 1.5;">${escapeHtml(analysis.summary)}</p>` : ''}
    </div>

    <div style="margin-bottom: 1rem;">
      <div style="font-weight: 600; margin-bottom: 0.4rem; color: #fff;">Matched Candidate Skills (${match.matched_skills.length}):</div>
      <div class="skills-pill-container">
        ${match.matched_skills.map(s => `<span class="badge badge-offer">${escapeHtml(s)}</span>`).join('') || '<span style="color: var(--text-muted);">None detected</span>'}
      </div>
    </div>

    <div style="margin-bottom: 1rem;">
      <div style="font-weight: 600; margin-bottom: 0.4rem; color: var(--accent-rose);">Missing / Recommended Skills (${match.missing_skills.length}):</div>
      <div class="skills-pill-container">
        ${match.missing_skills.map(s => `<span class="badge badge-rejected">${escapeHtml(s)}</span>`).join('') || '<span style="color: var(--text-muted);">Great match!</span>'}
      </div>
    </div>

    <div>
      <div style="font-weight: 600; margin-bottom: 0.4rem; color: #fff;">Top ATS Keywords:</div>
      <div class="skills-pill-container">
        ${(analysis.keywords || []).map(k => `<span class="badge badge-ats">${escapeHtml(k)}</span>`).join('')}
      </div>
    </div>
  `;
}

async function generateOutreachForJd(jobData) {
  try {
    const res = await fetch('/api/ai/tailor-cv', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_data: jobData })
    });
    const data = await res.json();
    if (data.success && data.outreach) {
      const box = document.getElementById('outreach-output-box');
      box.style.display = 'block';
      document.getElementById('outreach-linkedin-text').value = data.outreach.linkedin_message || '';
      document.getElementById('outreach-email-text').value = data.outreach.email_body || '';
    }
  } catch (err) {
    console.error("Outreach generation notice:", err);
  }
}

function inspectJobAi(jobId) {
  switchTab('tab-ai');
  const job = allTrackedJobs.find(j => j.id === jobId);
  if (job) {
    document.getElementById('ai-jd-input').value = job.description || `${job.title} at ${job.company}\nLocation: ${job.location}\nSkills: ${(job.skills || []).join(', ')}`;
    setTimeout(() => {
      document.getElementById('btn-analyze-jd').click();
    }, 200);
  }
}

// --- Tab 6: Settings ---
function initSettings() {
  const form = document.getElementById('form-settings');
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const geminiKey = document.getElementById('setting-gemini-key').value.trim();
    const sheetName = document.getElementById('setting-sheet-name').value.trim();

    try {
      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ gemini_api_key: geminiKey, google_sheet_name: sheetName })
      });
      const data = await res.json();
      if (data.success) {
        showToast("Settings updated successfully!", "success");
      }
    } catch (err) {
      showToast("Failed to save settings", "error");
    }
  });

  document.getElementById('btn-test-sheets').addEventListener('click', syncSheets);
}

// --- Modal Add Job ---
function initModal() {
  const modal = document.getElementById('modal-add-job');
  const openBtn = document.getElementById('btn-open-new-job-modal');
  const closeBtn = document.getElementById('btn-close-add-modal');
  const form = document.getElementById('form-add-manual-job');

  openBtn.addEventListener('click', () => modal.classList.add('active'));
  closeBtn.addEventListener('click', () => modal.classList.remove('active'));
  modal.addEventListener('click', (e) => {
    if (e.target === modal) modal.classList.remove('active');
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const newJob = {
      title: document.getElementById('manual-job-title').value.trim(),
      company: document.getElementById('manual-job-company').value.trim(),
      location: document.getElementById('manual-job-loc').value.trim(),
      status: document.getElementById('manual-job-status').value,
      job_url: document.getElementById('manual-job-url').value.trim(),
      career_page_url: document.getElementById('manual-job-career-url').value.trim(),
      skills: document.getElementById('manual-job-skills').value.split(',').map(s => s.trim()).filter(Boolean),
      description: document.getElementById('manual-job-desc').value.trim(),
      source: 'Manual'
    };

    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newJob)
      });
      const data = await res.json();
      if (data.success) {
        showToast("Job added to pipeline!", "success");
        modal.classList.remove('active');
        form.reset();
        loadPipeline();
      }
    } catch (err) {
      showToast("Failed to create job", "error");
    }
  });
}

// ===================================================================
// People & Referrals Tab (HR, Recruiters, Hiring Managers)
// ===================================================================

let currentDiscoveredContacts = [];

function initContactsTab() {
  const form = document.getElementById('form-contacts-search');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const company = document.getElementById('contact-search-company').value.trim();
      const contactType = document.getElementById('contact-search-type').value;
      const location = document.getElementById('contact-search-location').value.trim();

      const btn = document.getElementById('btn-search-contacts');
      const origText = btn.innerHTML;
      btn.innerHTML = `<span class="spinner"></span> <span>Searching Contacts...</span>`;
      btn.disabled = true;

      try {
        showToast(`Searching HR, recruiters & employees for ${company}...`, "info");
        const res = await fetch('/api/contacts/search', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ company, contact_type: contactType, location, max_results: 12 })
        });
        const data = await res.json();
        if (data.success) {
          currentDiscoveredContacts = data.contacts || [];
          document.getElementById('contacts-count').innerText = currentDiscoveredContacts.length;

          // Display Email Pattern Banner
          if (data.email_patterns && data.email_patterns.domain) {
            const banner = document.getElementById('company-email-intel-banner');
            banner.style.display = 'block';
            document.getElementById('intel-domain').innerText = data.email_patterns.domain;
            document.getElementById('intel-pattern').innerText = data.email_patterns.example || `first.last@${data.email_patterns.domain}`;
          }

          renderContactsCards(currentDiscoveredContacts);
          showToast(`Found ${currentDiscoveredContacts.length} verified contacts for ${company}!`, "success");
        } else {
          showToast(data.error || "Failed finding contacts", "error");
        }
      } catch (err) {
        showToast("Error searching contacts", "error");
      } finally {
        btn.innerHTML = origText;
        btn.disabled = false;
      }
    });
  }

  const toggleSavedBtn = document.getElementById('btn-show-saved-contacts');
  if (toggleSavedBtn) {
    toggleSavedBtn.addEventListener('click', () => {
      const section = document.getElementById('saved-contacts-section');
      if (section.style.display === 'none' || !section.style.display) {
        section.style.display = 'block';
        loadSavedContacts();
        section.scrollIntoView({ behavior: 'smooth' });
      } else {
        section.style.display = 'none';
      }
    });
  }

  const refreshSavedBtn = document.getElementById('btn-refresh-saved-contacts');
  if (refreshSavedBtn) {
    refreshSavedBtn.addEventListener('click', loadSavedContacts);
  }
}

function renderContactsCards(contacts) {
  const container = document.getElementById('contacts-feed-container');
  if (!contacts || contacts.length === 0) {
    container.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 2.5rem; color: var(--text-muted);">
        No contacts found. Try adjusting role filter or company spelling.
      </div>
    `;
    return;
  }

  container.innerHTML = contacts.map(c => {
    let roleBadgeClass = 'badge-source';
    if (c.role_category.includes('Recruiter')) roleBadgeClass = 'badge-ats';
    if (c.role_category.includes('Manager')) roleBadgeClass = 'badge-match';
    if (c.role_category.includes('Employee')) roleBadgeClass = 'badge-offer';

    return `
      <div class="job-card" id="contact-card-${c.id}" style="display: flex; flex-direction: column; justify-content: space-between;">
        <div>
          <div class="job-card-top" style="margin-bottom: 0.5rem;">
            <div>
              <div style="font-size: 1.05rem; font-weight: 700; color: #fff;">
                ${escapeHtml(c.name)}
              </div>
              <div style="font-size: 0.85rem; color: var(--accent-cyan); font-weight: 500; margin-top: 0.15rem;">
                ${escapeHtml(c.company)}
              </div>
            </div>
            <span class="badge ${roleBadgeClass}">${escapeHtml(c.role_category)}</span>
          </div>

          <div style="font-size: 0.825rem; color: var(--text-secondary); line-height: 1.4; margin-bottom: 0.75rem;">
            ${escapeHtml(c.headline)}
          </div>

          ${c.predicted_email ? `
            <div style="display: inline-flex; align-items: center; gap: 0.5rem; background: rgba(0,0,0,0.25); border: 1px solid var(--border-color); border-radius: var(--radius-sm); padding: 0.25rem 0.6rem; font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.75rem;">
              <span>📧 Predicted Email:</span>
              <code style="color: var(--accent-emerald);">${escapeHtml(c.predicted_email)}</code>
              <button onclick="navigator.clipboard.writeText('${escapeHtml(c.predicted_email)}'); showToast('Email copied!', 'success');" style="background: transparent; border: none; cursor: pointer; color: #fff; font-size: 0.75rem;" title="Copy Email">📋</button>
            </div>
          ` : ''}
        </div>

        <div class="job-card-actions" style="margin-top: 0.75rem;">
          <div style="display: flex; gap: 0.4rem; flex-wrap: wrap;">
            <a href="${escapeHtml(c.profile_url)}" target="_blank" class="btn btn-secondary btn-sm" title="Open LinkedIn Profile">
              🔗 LinkedIn ↗
            </a>
            <button class="btn btn-gradient btn-sm" onclick="openOutreachForContact('${c.id}')" title="Generate personalized connection note & referral pitch">
              ✉️ Draft Outreach
            </button>
          </div>
          <button class="btn btn-primary btn-sm" onclick="saveContactRecord('${c.id}')" title="Save to your networking tracker">
            💾 Save
          </button>
        </div>
      </div>
    `;
  }).join('');
}

// Find HR from any job card directly
function findCompanyContacts(companyName, location = "Bengaluru, Karnataka, India") {
  if (!companyName) return;
  switchTab('tab-contacts');
  setTimeout(() => {
    const input = document.getElementById('contact-search-company');
    const locInput = document.getElementById('contact-search-location');
    if (input) input.value = companyName;
    if (locInput && !locInput.value) locInput.value = location;
    const form = document.getElementById('form-contacts-search');
    if (form) form.dispatchEvent(new Event('submit'));
  }, 250);
}

async function saveContactRecord(contactId) {
  const contact = currentDiscoveredContacts.find(c => c.id === contactId);
  if (!contact) return;

  try {
    const res = await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(contact)
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Saved ${contact.name} to Networking Tracker!`, "success");
      const card = document.getElementById(`contact-card-${contactId}`);
      if (card) {
        const saveBtn = card.querySelector('.btn-primary');
        if (saveBtn) {
          saveBtn.className = "btn btn-success btn-sm";
          saveBtn.innerText = "✓ Saved";
        }
      }
    }
  } catch (err) {
    showToast("Failed to save contact", "error");
  }
}

async function loadSavedContacts() {
  try {
    const res = await fetch('/api/contacts');
    const data = await res.json();
    const container = document.getElementById('saved-contacts-table-container');
    if (!data.success || !data.contacts || data.contacts.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-muted);">
          No saved contacts yet. Search for recruiters above and click "Save"!
        </div>
      `;
      return;
    }

    container.innerHTML = `
      <div style="overflow-x: auto;">
        <table style="width: 100%; border-collapse: collapse; font-size: 0.85rem; text-align: left;">
          <thead>
            <tr style="border-bottom: 1px solid var(--border-color); color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem;">
              <th style="padding: 0.75rem 0.5rem;">Contact Name</th>
              <th style="padding: 0.75rem 0.5rem;">Role / Title</th>
              <th style="padding: 0.75rem 0.5rem;">Company</th>
              <th style="padding: 0.75rem 0.5rem;">Email / LinkedIn</th>
              <th style="padding: 0.75rem 0.5rem;">Outreach Status</th>
              <th style="padding: 0.75rem 0.5rem; text-align: right;">Actions</th>
            </tr>
          </thead>
          <tbody>
            ${data.contacts.map(c => `
              <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="padding: 0.75rem 0.5rem; font-weight: 600; color: #fff;">${escapeHtml(c.name)}</td>
                <td style="padding: 0.75rem 0.5rem; color: var(--text-secondary); max-width: 220px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(c.headline)}</td>
                <td style="padding: 0.75rem 0.5rem; color: var(--accent-cyan); font-weight: 600;">${escapeHtml(c.company)}</td>
                <td style="padding: 0.75rem 0.5rem;">
                  <div style="display: flex; gap: 0.4rem; align-items: center;">
                    ${c.profile_url ? `<a href="${escapeHtml(c.profile_url)}" target="_blank" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem;">LinkedIn ↗</a>` : ''}
                    ${c.predicted_email ? `<button onclick="navigator.clipboard.writeText('${escapeHtml(c.predicted_email)}'); showToast('Email copied!', 'success');" class="btn btn-secondary btn-sm" style="padding: 0.2rem 0.5rem;">📧</button>` : ''}
                  </div>
                </td>
                <td style="padding: 0.75rem 0.5rem;">
                  <select class="form-select" style="padding: 0.2rem 0.5rem; font-size: 0.75rem; width: auto;" onchange="updateSavedContactStatus('${c.id}', this.value)">
                    <option value="Not Contacted" ${c.outreach_status === 'Not Contacted' ? 'selected' : ''}>Not Contacted</option>
                    <option value="Message Sent" ${c.outreach_status === 'Message Sent' ? 'selected' : ''}>Message Sent</option>
                    <option value="Connected" ${c.outreach_status === 'Connected' ? 'selected' : ''}>Connected</option>
                    <option value="Call Scheduled" ${c.outreach_status === 'Call Scheduled' ? 'selected' : ''}>Call Scheduled</option>
                    <option value="Referred" ${c.outreach_status === 'Referred' ? 'selected' : ''}>🏆 Referred</option>
                  </select>
                </td>
                <td style="padding: 0.75rem 0.5rem; text-align: right;">
                  <button class="btn btn-secondary btn-sm" style="color: var(--accent-rose); padding: 0.2rem 0.5rem;" onclick="deleteSavedContact('${c.id}')">🗑</button>
                </td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } catch (err) {
    console.error("Error loading saved contacts:", err);
  }
}

async function updateSavedContactStatus(cid, status) {
  try {
    const res = await fetch(`/api/contacts/${cid}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Contact status updated to ${status}`, "success");
    }
  } catch (err) {
    showToast("Failed to update status", "error");
  }
}

async function deleteSavedContact(cid) {
  if (!confirm("Remove this contact?")) return;
  try {
    const res = await fetch(`/api/contacts/${cid}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast("Contact removed", "info");
      loadSavedContacts();
    }
  } catch (err) {
    showToast("Failed to delete contact", "error");
  }
}

// ===================================================================
// Referral & Outreach Studio Modal
// ===================================================================

function initOutreachModal() {
  const modal = document.getElementById('modal-outreach');
  const closeBtn = document.getElementById('btn-close-outreach-modal');
  if (closeBtn) closeBtn.addEventListener('click', () => modal.classList.remove('active'));

  if (modal) {
    modal.addEventListener('click', (e) => {
      if (e.target === modal) modal.classList.remove('active');
    });
  }

  // Live char counter for LinkedIn connection note
  const noteArea = document.getElementById('modal-conn-note-text');
  const counter = document.getElementById('char-counter');
  if (noteArea && counter) {
    noteArea.addEventListener('input', () => {
      const len = noteArea.value.length;
      counter.innerText = `${len} / 300`;
      counter.style.color = len > 300 ? 'var(--accent-rose)' : 'var(--accent-cyan)';
    });
  }

  // Strategy change or regenerate listener
  const stratSelect = document.getElementById('outreach-strategy-select');
  if (stratSelect) stratSelect.addEventListener('change', fetchAndRenderOutreach);

  const regenBtn = document.getElementById('btn-regenerate-outreach');
  if (regenBtn) regenBtn.addEventListener('click', fetchAndRenderOutreach);

  // Copy buttons
  const copyNoteBtn = document.getElementById('btn-copy-modal-conn-note');
  if (copyNoteBtn) {
    copyNoteBtn.addEventListener('click', () => {
      const note = document.getElementById('modal-conn-note-text').value;
      if (!note) return;
      navigator.clipboard.writeText(note);
      showToast("LinkedIn Connection Note copied to clipboard!", "success");
    });
  }

  const copyEmailBtn = document.getElementById('btn-copy-modal-full-msg');
  if (copyEmailBtn) {
    copyEmailBtn.addEventListener('click', () => {
      const subj = document.getElementById('modal-email-subject').value;
      const body = document.getElementById('modal-full-msg-text').value;
      const fullText = `Subject: ${subj}\n\n${body}`;
      navigator.clipboard.writeText(fullText);
      showToast("Full InMail / Email draft copied to clipboard!", "success");
    });
  }

  const saveFromModalBtn = document.getElementById('btn-save-contact-from-modal');
  if (saveFromModalBtn) {
    saveFromModalBtn.addEventListener('click', async () => {
      if (!activeOutreachContact) return;
      await saveContactRecord(activeOutreachContact.id);
      modal.classList.remove('active');
    });
  }
}

function openOutreachForContact(contactId) {
  const contact = currentDiscoveredContacts.find(c => c.id === contactId);
  if (!contact) return;

  activeOutreachContact = contact;
  const modal = document.getElementById('modal-outreach');
  modal.classList.add('active');

  document.getElementById('modal-outreach-subtitle').innerText = `Target: ${contact.name} (${contact.role_category}) @ ${contact.company}`;
  document.getElementById('btn-modal-open-linkedin').href = contact.profile_url || '#';

  // Auto-detect best strategy based on role
  const stratSelect = document.getElementById('outreach-strategy-select');
  if (contact.role_category.includes('Recruiter')) stratSelect.value = 'recruiter';
  else if (contact.role_category.includes('Manager')) stratSelect.value = 'manager';
  else stratSelect.value = 'referral';

  // Fill target role from candidate profile title or default
  const roleInput = document.getElementById('outreach-target-role');
  if (!roleInput.value && currentProfile && currentProfile.title) {
    roleInput.value = currentProfile.title;
  }

  fetchAndRenderOutreach();
}

async function fetchAndRenderOutreach() {
  if (!activeOutreachContact) return;

  const strategy = document.getElementById('outreach-strategy-select').value;
  const targetRole = document.getElementById('outreach-target-role').value.trim() || 'Software Engineer';

  const noteArea = document.getElementById('modal-conn-note-text');
  const subjInput = document.getElementById('modal-email-subject');
  const bodyArea = document.getElementById('modal-full-msg-text');
  const counter = document.getElementById('char-counter');

  noteArea.value = "Crafting personalized LinkedIn connection note...";
  bodyArea.value = "Generating high-converting outreach message...";

  try {
    const res = await fetch('/api/contacts/outreach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contact_name: activeOutreachContact.name,
        contact_role: activeOutreachContact.headline || activeOutreachContact.role_category,
        company: activeOutreachContact.company,
        target_role: targetRole,
        outreach_type: strategy
      })
    });
    const data = await res.json();
    if (data.success && data.outreach) {
      noteArea.value = data.outreach.connection_note || '';
      subjInput.value = data.outreach.email_subject || '';
      bodyArea.value = data.outreach.full_message || '';

      const len = noteArea.value.length;
      counter.innerText = `${len} / 300`;
      counter.style.color = len > 300 ? 'var(--accent-rose)' : 'var(--accent-cyan)';
    }
  } catch (err) {
    showToast("Failed to generate outreach pitch", "error");
  }
}

// --- Helpers ---
function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function debounce(func, wait) {
  let timeout;
  return function(...args) {
    clearTimeout(timeout);
    timeout = setTimeout(() => func.apply(this, args), wait);
  };
}
