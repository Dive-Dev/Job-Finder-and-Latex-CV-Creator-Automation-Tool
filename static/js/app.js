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
  initAgentTab();
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

      if (targetId === 'tab-agent') loadAgentInitialState();
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

// --- Universal CSV Export Helper ---
function exportJobsToCsv(filename, jobs) {
  if (!jobs || jobs.length === 0) {
    showToast("No jobs to export in the current view!", "info");
    return;
  }
  const headers = ["ID", "Company", "Title", "Location", "ATS Provider", "Match Score", "Source", "Status", "Job URL", "Career Portal URL"];
  const rows = jobs.map(j => [
    `"${(j.id || '').toString().replace(/"/g, '""')}"`,
    `"${(j.company || '').toString().replace(/"/g, '""')}"`,
    `"${(j.title || '').toString().replace(/"/g, '""')}"`,
    `"${(j.location || '').toString().replace(/"/g, '""')}"`,
    `"${(j.ats_provider || '').toString().replace(/"/g, '""')}"`,
    `"${j.match_score ? Math.round(j.match_score) + '%' : ''}"`,
    `"${(j.source || '').toString().replace(/"/g, '""')}"`,
    `"${(j.status || 'Wishlist').toString().replace(/"/g, '""')}"`,
    `"${(j.job_url || '').toString().replace(/"/g, '""')}"`,
    `"${(j.career_page_url || '').toString().replace(/"/g, '""')}"`
  ]);
  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.remove();
  showToast(`📥 Exported ${jobs.length} jobs to ${filename}`, "success");
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
    currentDiscoveryJobs = [];
    selectedDiscoveryJobIds.clear();
    const batchBar = document.getElementById('discovery-batch-bar');
    if (batchBar) batchBar.style.display = 'none';
    document.getElementById('discovery-feed-container').innerHTML = `
      <div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">
        <div>🎯 Start a search above using a LinkedIn URL or Google Role & Location to discover jobs in spreadsheet view!</div>
      </div>
    `;
    document.getElementById('discovery-count').innerText = '0';
  });

  // Discovery Table Live Filter
  const discFilterInput = document.getElementById('discovery-table-filter');
  if (discFilterInput) {
    discFilterInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#discovery-table-body tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = (!term || text.includes(term)) ? '' : 'none';
      });
    });
  }

  // Discovery Table CSV Export
  const discExportBtn = document.getElementById('btn-export-discovery-csv');
  if (discExportBtn) {
    discExportBtn.addEventListener('click', () => {
      exportJobsToCsv('JobPulse_Discovery_Jobs.csv', currentDiscoveryJobs);
    });
  }

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


// State for Discovery multi-selection
let selectedDiscoveryJobIds = new Set();
let currentDiscoveryJobs = [];

function renderDiscoveryCards(jobs) {
  const container = document.getElementById('discovery-feed-container');
  const countElem = document.getElementById('discovery-count');
  const batchBar = document.getElementById('discovery-batch-bar');
  const selectedCountElem = document.getElementById('discovery-selected-count');

  currentDiscoveryJobs = jobs || [];
  selectedDiscoveryJobIds.clear();
  if (batchBar) batchBar.style.display = 'none';
  if (selectedCountElem) selectedCountElem.innerText = '0';
  if (countElem) countElem.innerText = currentDiscoveryJobs.length;

  if (!currentDiscoveryJobs || currentDiscoveryJobs.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">No job postings found matching this query. Try broader keywords or select Bengaluru tech hubs.</div>`;
    return;
  }

  // Render dense Sheets-based Data Table
  container.innerHTML = `
    <table class="sheets-table">
      <thead>
        <tr>
          <th class="sheets-checkbox-cell">
            <input type="checkbox" id="discovery-select-all" class="sheets-custom-checkbox" title="Select All">
          </th>
          <th style="min-width: 140px;">Company</th>
          <th style="min-width: 220px;">Role / Job Title</th>
          <th style="min-width: 130px;">Location</th>
          <th style="min-width: 120px;">Source / ATS</th>
          <th style="min-width: 90px;">ATS Match</th>
          <th style="min-width: 110px;">Career Portal</th>
          <th style="min-width: 210px;">Actions</th>
        </tr>
      </thead>
      <tbody id="discovery-table-body">
        ${currentDiscoveryJobs.map(job => {
          const matchScore = job.match_score ? `${Math.round(job.match_score)}%` : 'ATS Ready';
          const matchClass = job.match_score >= 80 ? 'badge-match' : (job.match_score >= 60 ? 'badge-ats' : 'badge-source');
          return `
            <tr id="discovery-row-${job.id}" data-job-id="${job.id}">
              <td class="sheets-checkbox-cell">
                <input type="checkbox" class="sheets-custom-checkbox discovery-row-chk" data-job-id="${job.id}">
              </td>
              <td>
                <div class="sheets-company-cell">
                  <span>🏢</span>
                  <span>${escapeHtml(job.company)}</span>
                </div>
              </td>
              <td>
                <a href="${escapeHtml(job.job_url || '#')}" target="_blank" class="sheets-title-link" title="${escapeHtml(job.title)}">
                  ${escapeHtml(job.title)}
                </a>
              </td>
              <td>
                <div class="sheets-location-cell" title="${escapeHtml(job.location || 'Bengaluru')}">
                  📍 ${escapeHtml(job.location || 'Bengaluru')}
                </div>
              </td>
              <td>
                <span class="badge badge-source" style="font-size: 0.72rem;">${escapeHtml(job.ats_provider || job.source || 'Direct')}</span>
              </td>
              <td>
                <span class="badge ${matchClass}" style="font-size: 0.72rem;">${matchScore}</span>
              </td>
              <td>
                ${job.career_page_url ? `
                  <a href="${escapeHtml(job.career_page_url)}" target="_blank" class="btn-icon-sm" style="color: var(--accent-cyan);" title="Official company careers portal">
                    🏢 Portal ↗
                  </a>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
              </td>
              <td>
                <div class="sheets-actions-cell">
                  <button class="btn btn-primary btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;" onclick="applyJob('${job.id}', '${encodeURIComponent(job.career_page_url || job.job_url)}')">
                    ⚡ Apply
                  </button>
                  <button class="btn-icon-sm" onclick="tailorForJob('${job.id}')" title="Tailor LaTeX CV">
                    📄 CV
                  </button>
                  <button class="btn-icon-sm" onclick="inspectJobAi('${job.id}')" title="Inspect JD with AI">
                    🤖 JD
                  </button>
                  <button class="btn-icon-sm" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR contacts">
                    👥 HR
                  </button>
                  <button class="btn-icon-sm btn-danger" onclick="deleteDiscoveryJob('${job.id}')" title="Delete job">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach Selection Listeners
  initDiscoverySelectionEvents();
}

function initDiscoverySelectionEvents() {
  const selectAll = document.getElementById('discovery-select-all');
  const rowCheckboxes = document.querySelectorAll('.discovery-row-chk');
  const batchBar = document.getElementById('discovery-batch-bar');
  const countElem = document.getElementById('discovery-selected-count');

  function updateBatchBar() {
    const count = selectedDiscoveryJobIds.size;
    if (countElem) countElem.innerText = count;
    if (batchBar) batchBar.style.display = count > 0 ? 'flex' : 'none';
    if (selectAll) {
      selectAll.checked = count > 0 && count === rowCheckboxes.length;
      selectAll.indeterminate = count > 0 && count < rowCheckboxes.length;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const isChecked = selectAll.checked;
      rowCheckboxes.forEach(chk => {
        chk.checked = isChecked;
        const jid = chk.dataset.jobId;
        const row = document.getElementById(`discovery-row-${jid}`);
        if (isChecked) {
          selectedDiscoveryJobIds.add(jid);
          if (row) row.classList.add('row-selected');
        } else {
          selectedDiscoveryJobIds.delete(jid);
          if (row) row.classList.remove('row-selected');
        }
      });
      updateBatchBar();
    });
  }

  rowCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const jid = chk.dataset.jobId;
      const row = document.getElementById(`discovery-row-${jid}`);
      if (chk.checked) {
        selectedDiscoveryJobIds.add(jid);
        if (row) row.classList.add('row-selected');
      } else {
        selectedDiscoveryJobIds.delete(jid);
        if (row) row.classList.remove('row-selected');
      }
      updateBatchBar();
    });
  });

  // Batch Delete button
  const batchDeleteBtn = document.getElementById('btn-discovery-batch-delete');
  if (batchDeleteBtn) {
    batchDeleteBtn.onclick = async () => {
      const ids = Array.from(selectedDiscoveryJobIds);
      if (ids.length === 0) return;
      if (!confirm(`Are you sure you want to delete ${ids.length} selected job(s)?`)) return;

      try {
        const res = await fetch('/api/jobs/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Deleted ${data.deleted_count || ids.length} jobs successfully!`, "info");
          ids.forEach(id => {
            const row = document.getElementById(`discovery-row-${id}`);
            if (row) row.remove();
          });
          currentDiscoveryJobs = currentDiscoveryJobs.filter(j => !selectedDiscoveryJobIds.has(j.id));
          document.getElementById('discovery-count').innerText = currentDiscoveryJobs.length;
          selectedDiscoveryJobIds.clear();
          updateBatchBar();
          initStats();
        } else {
          showToast(data.error || "Batch delete failed", "error");
        }
      } catch (err) {
        showToast("Error executing batch delete", "error");
      }
    };
  }

  // Batch Apply button
  const batchApplyBtn = document.getElementById('btn-discovery-batch-apply');
  if (batchApplyBtn) {
    batchApplyBtn.onclick = async () => {
      const ids = Array.from(selectedDiscoveryJobIds);
      if (ids.length === 0) return;

      try {
        const res = await fetch('/api/jobs/batch-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids, status: 'Applied' })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Marked ${ids.length} jobs as Applied!`, "success");
          selectedDiscoveryJobIds.clear();
          updateBatchBar();
          initStats();
        }
      } catch (err) {
        showToast("Error updating status", "error");
      }
    };
  }

  // Clear Selection button
  const clearSelBtn = document.getElementById('btn-discovery-clear-sel');
  if (clearSelBtn) {
    clearSelBtn.onclick = () => {
      selectedDiscoveryJobIds.clear();
      rowCheckboxes.forEach(chk => {
        chk.checked = false;
        const row = document.getElementById(`discovery-row-${chk.dataset.jobId}`);
        if (row) row.classList.remove('row-selected');
      });
      updateBatchBar();
    };
  }
}

async function deleteDiscoveryJob(jobId) {
  if (!confirm("Are you sure you want to delete this job?")) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast("Job deleted", "info");
      const row = document.getElementById(`discovery-row-${jobId}`);
      if (row) row.remove();
      selectedDiscoveryJobIds.delete(jobId);
      currentDiscoveryJobs = currentDiscoveryJobs.filter(j => j.id !== jobId);
      document.getElementById('discovery-count').innerText = currentDiscoveryJobs.length;
      initStats();
    }
  } catch (err) {
    showToast("Failed to delete job", "error");
  }
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
      const row = document.getElementById(`discovery-row-${jobId}`) || document.getElementById(`pipeline-row-${jobId}`);
      if (row) {
        const applyBtn = row.querySelector('.btn-primary');
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

// Quick Scrape from Chips
function quickScrapeCompany(name) {
  const input = document.getElementById('company-search-name');
  if (input) {
    input.value = name;
    const form = document.getElementById('form-company-search');
    if (form) {
      if (typeof form.requestSubmit === 'function') {
        form.requestSubmit();
      } else {
        form.dispatchEvent(new Event('submit', { cancelable: true }));
      }
    }
  }
}

// --- Tab 2: Company Career Sites & Live Vacancy Scraper ---
let currentCompanyJobs = [];
let selectedCompanyJobIds = new Set();

function initCompanySearch() {
  const form = document.getElementById('form-company-search');
  if (form) {
    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const companyInput = document.getElementById('company-search-name');
      const roleInput = document.getElementById('company-search-role');
      const locInput = document.getElementById('company-search-loc');

      const company = companyInput ? companyInput.value.trim() : '';
      const role = roleInput ? roleInput.value.trim() : '';
      const location = locInput ? locInput.value.trim() : 'Bengaluru, Karnataka, India';

      if (!company) {
        showToast("Please enter a company name (e.g. Sandisk, Amazon, Swiggy)", "error");
        return;
      }

      const btn = document.getElementById('btn-search-company-portal');
      const originalText = btn ? btn.innerHTML : 'Scrape';
      if (btn) {
        btn.innerHTML = `<span class="spinner"></span> <span>Crawling Vacancies & Portals...</span>`;
        btn.disabled = true;
      }

      try {
        showToast(`⚡ Crawling live vacancies & verified career portals for: ${company}...`, "info");
        const res = await fetch('/api/scrape/company', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            company,
            role,
            location,
            max_results: 15,
            auto_save: true
          })
        });
        const data = await res.json();
        if (data.success) {
          currentCompanyJobs = data.jobs || [];
          const companiesList = data.companies || (data.company_info ? [data.company_info] : []);
          renderCompanyScrapedJobs(currentCompanyJobs, companiesList);
          initStats();
          showToast(`Scraped ${currentCompanyJobs.length} live vacancies across verified career ecosystems!`, "success");
        } else {
          showToast(data.error || "Failed to find company career portal", "error");
        }
      } catch (err) {
        console.error("Company scrape error:", err);
        showToast("Network error crawling company portals", "error");
      } finally {
        if (btn) {
          btn.innerHTML = originalText;
          btn.disabled = false;
        }
      }
    });
  }

  initCompanyBatchControls();
}

function renderCompanyScrapedJobs(jobs, companiesList) {
  const box = document.getElementById('company-search-result-box');
  const batchBar = document.getElementById('company-batch-bar');
  const countElem = document.getElementById('company-selected-count');

  box.style.display = 'block';
  selectedCompanyJobIds.clear();
  if (batchBar) batchBar.style.display = 'none';
  if (countElem) countElem.innerText = '0';

  let portalsHtml = '';
  if (companiesList && companiesList.length > 0) {
    portalsHtml = `
      <div style="margin-bottom: 1.5rem;">
        <div style="font-size: 0.85rem; font-weight: 700; color: #fff; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 0.75rem; display: flex; align-items: center; gap: 0.5rem;">
          <span>🏢 Verified Career Portals & Intelligence (${companiesList.length})</span>
          <span class="badge badge-ats">Live Portals</span>
        </div>
        <div class="grid-3" style="gap: 1rem;">
          ${companiesList.map(info => {
            const crawled = info.crawled_data || {};
            return `
              <div class="job-card" style="margin-bottom: 0;">
                <div class="job-card-top" style="margin-bottom: 0.5rem;">
                  <div>
                    <div class="job-company" style="font-size: 1.05rem;">🏢 ${escapeHtml(info.company)}</div>
                    ${info.official_site ? `
                      <a href="${escapeHtml(info.official_site)}" target="_blank" style="font-size: 0.775rem; color: var(--accent-cyan); text-decoration: none;">
                        🌐 ${escapeHtml(info.official_site.replace(/^https?:\/\//, ''))}
                      </a>` : ''}
                  </div>
                  <span class="badge badge-ats">⚡ ${escapeHtml(info.ats_provider || 'Direct Portal')}</span>
                </div>
                ${crawled.page_title ? `
                  <div style="font-size: 0.8rem; color: var(--text-primary); font-weight: 500; margin-bottom: 0.35rem; line-height: 1.3;">
                    ${escapeHtml(crawled.page_title)}
                  </div>` : ''}
                ${crawled.meta_description ? `
                  <div style="font-size: 0.75rem; color: var(--text-muted); line-height: 1.35; margin-bottom: 0.75rem; max-height: 2.7em; overflow: hidden; text-overflow: ellipsis;">
                    ${escapeHtml(crawled.meta_description)}
                  </div>` : ''}
                <div class="job-card-actions" style="margin-top: 0.5rem;">
                  <a href="${escapeHtml(info.career_page_url)}" target="_blank" class="btn btn-primary btn-sm" style="font-size: 0.775rem;">
                    🚀 Careers Portal ↗
                  </a>
                  <button class="btn btn-secondary btn-sm" onclick="findCompanyContacts('${escapeHtml(info.company)}')" title="Find HR & Referrals">
                    👥 HR
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  // Live Vacancies Spreadsheet Grid
  let tableHtml = '';
  if (!jobs || jobs.length === 0) {
    tableHtml = `
      <div style="text-align: center; padding: 2.5rem 1rem; color: var(--text-muted); background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
        <div>ℹ️ No specific live vacancy rows found for this search. You can click <b>Careers Portal ↗</b> above to search their portal directly!</div>
      </div>
    `;
  } else {
    tableHtml = `
      <div class="sheets-view-container">
        <table class="sheets-table">
          <thead>
            <tr>
              <th class="sheets-checkbox-cell">
                <input type="checkbox" id="company-select-all" class="sheets-custom-checkbox" title="Select All">
              </th>
              <th style="min-width: 140px;">Company</th>
              <th style="min-width: 220px;">Role / Live Vacancy</th>
              <th style="min-width: 130px;">Location</th>
              <th style="min-width: 120px;">Source / ATS</th>
              <th style="min-width: 90px;">ATS Match</th>
              <th style="min-width: 110px;">Career Portal</th>
              <th style="min-width: 210px;">Actions</th>
            </tr>
          </thead>
          <tbody id="company-table-body">
            ${jobs.map(job => {
              const matchScore = job.match_score ? `${Math.round(job.match_score)}%` : 'ATS Ready';
              const matchClass = job.match_score >= 80 ? 'badge-match' : (job.match_score >= 60 ? 'badge-ats' : 'badge-source');
              return `
                <tr id="company-row-${job.id}" data-job-id="${job.id}">
                  <td class="sheets-checkbox-cell">
                    <input type="checkbox" class="sheets-custom-checkbox company-row-chk" data-job-id="${job.id}">
                  </td>
                  <td>
                    <div class="sheets-company-cell">
                      <span>🏢</span>
                      <span>${escapeHtml(job.company)}</span>
                    </div>
                  </td>
                  <td>
                    <a href="${escapeHtml(job.job_url || '#')}" target="_blank" class="sheets-title-link" title="${escapeHtml(job.title)}">
                      ${escapeHtml(job.title)}
                    </a>
                  </td>
                  <td>
                    <div class="sheets-location-cell" title="${escapeHtml(job.location || 'Bengaluru')}">
                      📍 ${escapeHtml(job.location || 'Bengaluru')}
                    </div>
                  </td>
                  <td>
                    <span class="badge badge-source" style="font-size: 0.72rem;">${escapeHtml(job.ats_provider || job.source || 'Careers')}</span>
                  </td>
                  <td>
                    <span class="badge ${matchClass}" style="font-size: 0.72rem;">${matchScore}</span>
                  </td>
                  <td>
                    ${job.career_page_url ? `
                      <a href="${escapeHtml(job.career_page_url)}" target="_blank" class="btn-icon-sm" style="color: var(--accent-cyan);" title="Official company careers portal">
                        🏢 Portal ↗
                      </a>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
                  </td>
                  <td>
                    <div class="sheets-actions-cell">
                      <button class="btn btn-primary btn-sm" style="padding: 0.25rem 0.55rem; font-size: 0.75rem;" onclick="applyJob('${job.id}', '${encodeURIComponent(job.career_page_url || job.job_url)}')">
                        ⚡ Apply
                      </button>
                      <button class="btn-icon-sm" onclick="tailorForJob('${job.id}')" title="Tailor LaTeX CV">
                        📄 CV
                      </button>
                      <button class="btn-icon-sm" onclick="inspectJobAi('${job.id}')" title="Inspect JD with AI">
                        🤖 JD
                      </button>
                      <button class="btn-icon-sm" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR contacts">
                        👥 HR
                      </button>
                      <button class="btn-icon-sm btn-danger" onclick="deleteCompanyJob('${job.id}')" title="Delete job">
                        🗑️
                      </button>
                    </div>
                  </td>
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>
      </div>
    `;
  }

  box.innerHTML = `
    ${portalsHtml}
    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 1.5rem; margin-bottom: 0.85rem; flex-wrap: wrap; gap: 0.75rem;">
      <div>
        <div style="font-size: 1.1rem; font-weight: 700; color: #fff; display: flex; align-items: center; gap: 0.5rem;">
          <span>📋 Scraped Live Vacancies (<span id="company-jobs-count">${jobs.length}</span> Active Openings)</span>
          <span class="badge badge-match">Direct Links</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 0.2rem;">
          Sheets grid view with multi-select delete, 1-click application, and ATS profiling.
        </div>
      </div>
      <div style="display: flex; gap: 0.5rem; align-items: center; flex-wrap: wrap;">
        <input type="text" class="form-input" id="company-table-filter" placeholder="🔍 Live filter company jobs..." style="max-width: 220px; font-size: 0.8rem; padding: 0.35rem 0.65rem;">
        <button class="btn btn-secondary btn-sm" id="btn-export-company-csv" title="Export company openings to CSV">📥 Export CSV</button>
      </div>
    </div>
    ${tableHtml}
  `;

  // Attach table events
  attachCompanyTableEvents();
}

function attachCompanyTableEvents() {
  const selectAll = document.getElementById('company-select-all');
  const rowCheckboxes = document.querySelectorAll('.company-row-chk');
  const batchBar = document.getElementById('company-batch-bar');
  const countElem = document.getElementById('company-selected-count');

  function updateBatchBar() {
    const count = selectedCompanyJobIds.size;
    if (countElem) countElem.innerText = count;
    if (batchBar) batchBar.style.display = count > 0 ? 'flex' : 'none';
    if (selectAll) {
      selectAll.checked = count > 0 && count === rowCheckboxes.length;
      selectAll.indeterminate = count > 0 && count < rowCheckboxes.length;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const isChecked = selectAll.checked;
      rowCheckboxes.forEach(chk => {
        chk.checked = isChecked;
        const jid = chk.dataset.jobId;
        const row = document.getElementById(`company-row-${jid}`);
        if (isChecked) {
          selectedCompanyJobIds.add(jid);
          if (row) row.classList.add('row-selected');
        } else {
          selectedCompanyJobIds.delete(jid);
          if (row) row.classList.remove('row-selected');
        }
      });
      updateBatchBar();
    });
  }

  rowCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const jid = chk.dataset.jobId;
      const row = document.getElementById(`company-row-${jid}`);
      if (chk.checked) {
        selectedCompanyJobIds.add(jid);
        if (row) row.classList.add('row-selected');
      } else {
        selectedCompanyJobIds.delete(jid);
        if (row) row.classList.remove('row-selected');
      }
      updateBatchBar();
    });
  });

  // Live filter for company table
  const companyFilterInput = document.getElementById('company-table-filter');
  if (companyFilterInput) {
    companyFilterInput.addEventListener('input', (e) => {
      const term = e.target.value.toLowerCase().trim();
      const rows = document.querySelectorAll('#company-table-body tr');
      rows.forEach(r => {
        const text = r.innerText.toLowerCase();
        r.style.display = (!term || text.includes(term)) ? '' : 'none';
      });
    });
  }

  // Export CSV for company table
  const companyExportBtn = document.getElementById('btn-export-company-csv');
  if (companyExportBtn) {
    companyExportBtn.addEventListener('click', () => {
      exportJobsToCsv('JobPulse_Company_Openings.csv', currentCompanyJobs);
    });
  }
}

function initCompanyBatchControls() {
  const batchBar = document.getElementById('company-batch-bar');
  const countElem = document.getElementById('company-selected-count');
  const selectAll = document.getElementById('company-select-all');

  function updateBatchBar() {
    const count = selectedCompanyJobIds.size;
    if (countElem) countElem.innerText = count;
    if (batchBar) batchBar.style.display = count > 0 ? 'flex' : 'none';
    if (selectAll) {
      const rowCheckboxes = document.querySelectorAll('.company-row-chk');
      selectAll.checked = count > 0 && count === rowCheckboxes.length;
      selectAll.indeterminate = count > 0 && count < rowCheckboxes.length;
    }
  }

  // Batch Delete button
  const batchDeleteBtn = document.getElementById('btn-company-batch-delete');
  if (batchDeleteBtn) {
    batchDeleteBtn.onclick = async () => {
      const ids = Array.from(selectedCompanyJobIds);
      if (ids.length === 0) return;
      if (!confirm(`Are you sure you want to delete ${ids.length} selected job(s)?`)) return;

      try {
        const res = await fetch('/api/jobs/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Deleted ${data.deleted_count || ids.length} jobs successfully!`, "info");
          ids.forEach(id => {
            const row = document.getElementById(`company-row-${id}`);
            if (row) row.remove();
          });
          currentCompanyJobs = currentCompanyJobs.filter(j => !selectedCompanyJobIds.has(j.id));
          const countBadge = document.getElementById('company-jobs-count');
          if (countBadge) countBadge.innerText = currentCompanyJobs.length;
          selectedCompanyJobIds.clear();
          updateBatchBar();
          initStats();
        } else {
          showToast(data.error || "Batch delete failed", "error");
        }
      } catch (err) {
        showToast("Error executing batch delete", "error");
      }
    };
  }

  // Batch Apply button
  const batchApplyBtn = document.getElementById('btn-company-batch-apply');
  if (batchApplyBtn) {
    batchApplyBtn.onclick = async () => {
      const ids = Array.from(selectedCompanyJobIds);
      if (ids.length === 0) return;

      try {
        const res = await fetch('/api/jobs/batch-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids, status: 'Applied' })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Marked ${ids.length} jobs as Applied!`, "success");
          selectedCompanyJobIds.clear();
          updateBatchBar();
          initStats();
        }
      } catch (err) {
        showToast("Error updating status", "error");
      }
    };
  }

  // Clear Selection button
  const clearSelBtn = document.getElementById('btn-company-clear-sel');
  if (clearSelBtn) {
    clearSelBtn.onclick = () => {
      selectedCompanyJobIds.clear();
      document.querySelectorAll('.company-row-chk').forEach(c => c.checked = false);
      document.querySelectorAll('#company-table-body tr').forEach(r => r.classList.remove('row-selected'));
      updateBatchBar();
    };
  }
}

async function deleteCompanyJob(jobId) {
  if (!confirm("Are you sure you want to delete this job?")) return;
  try {
    const res = await fetch(`/api/jobs/${jobId}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast("Job deleted", "info");
      const row = document.getElementById(`company-row-${jobId}`);
      if (row) row.remove();
      selectedCompanyJobIds.delete(jobId);
      currentCompanyJobs = currentCompanyJobs.filter(j => j.id !== jobId);
      const countBadge = document.getElementById('company-jobs-count');
      if (countBadge) countBadge.innerText = currentCompanyJobs.length;
      const batchBar = document.getElementById('company-batch-bar');
      const countElem = document.getElementById('company-selected-count');
      if (countElem) countElem.innerText = selectedCompanyJobIds.size;
      if (batchBar) batchBar.style.display = selectedCompanyJobIds.size > 0 ? 'flex' : 'none';
      initStats();
    }
  } catch (err) {
    showToast("Failed to delete job", "error");
  }
}

// ===================================================================
// Tab: Autonomous Agent & Local Model Controller
// ===================================================================

let agentPollingInterval = null;
let lastAgentLogCount = 0;
let lastAgentDeliverables = [];
let lastAgentHrLeads = [];

function initAgentTab() {
  // Mission Form Submit
  const missionForm = document.getElementById('form-agent-mission');
  if (missionForm) {
    missionForm.addEventListener('submit', launchAgentMission);
  }

  // Stop / Abort Mission Button
  const stopBtn = document.getElementById('btn-stop-agent');
  if (stopBtn) {
    stopBtn.addEventListener('click', stopAgentMission);
  }

  // Local Model: Test Connection
  const testLlmBtn = document.getElementById('btn-test-local-llm');
  if (testLlmBtn) {
    testLlmBtn.addEventListener('click', testLocalModelConnection);
  }

  // Local Model: Save Config
  const saveLlmBtn = document.getElementById('btn-save-llm-cfg');
  if (saveLlmBtn) {
    saveLlmBtn.addEventListener('click', saveAgentLlmConfig);
  }

  // Provider change helper
  const providerSelect = document.getElementById('agent-llm-provider');
  if (providerSelect) {
    providerSelect.addEventListener('change', () => {
      const p = providerSelect.value;
      const urlInput = document.getElementById('agent-llm-url');
      const modelInput = document.getElementById('agent-llm-model');
      if (p === 'ollama') {
        if (!urlInput.value || urlInput.value.includes('1234')) urlInput.value = 'http://localhost:11434';
        if (!modelInput.value || modelInput.value === 'local-model') modelInput.value = 'llama3.2';
      } else if (p === 'local_openai') {
        if (!urlInput.value || urlInput.value.includes('11434')) urlInput.value = 'http://localhost:1234/v1';
        if (!modelInput.value) modelInput.value = 'local-model';
      }
    });
  }

  // Clear Terminal Button
  const clearTerminalBtn = document.getElementById('btn-clear-agent-terminal');
  if (clearTerminalBtn) {
    clearTerminalBtn.addEventListener('click', () => {
      const term = document.getElementById('agent-live-terminal');
      if (term) term.innerHTML = `<div class="terminal-line"><span class="t-time">00:00:00</span><span class="t-level-info">[SYS]</span><span class="t-msg">Console cleared.</span></div>`;
      lastAgentLogCount = 0;
    });
  }

  // Export Deliverables CSV Button
  const exportCsvBtn = document.getElementById('btn-export-agent-csv');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      exportJobsToCsv("Agent_Mission_Deliverables.csv", lastAgentDeliverables);
    });
  }
}

window.applyAgentPreset = function(presetType) {
  const container = document.getElementById('agent-presets-container');
  if (container) {
    container.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active-bengaluru'));
  }
  const chips = container ? container.querySelectorAll('.filter-chip') : [];

  const rolesInput = document.getElementById('agent-target-roles');
  const companiesInput = document.getElementById('agent-target-companies');
  const locInput = document.getElementById('agent-target-loc');
  const threshSelect = document.getElementById('agent-min-threshold');
  const chkTailor = document.getElementById('agent-chk-tailor');
  const chkHr = document.getElementById('agent-chk-hr');
  const chkPipeline = document.getElementById('agent-chk-pipeline');

  if (presetType === 'full_hunt') {
    if (chips[0]) chips[0].classList.add('active-bengaluru');
    if (rolesInput) rolesInput.value = "Full Stack Developer, Python Developer, Software Engineer";
    if (companiesInput) companiesInput.value = "Sandisk, Amazon, Swiggy, Zepto, Google, Razorpay, Flipkart, CRED";
    if (locInput) locInput.value = "Bengaluru, Karnataka, India";
    if (threshSelect) threshSelect.value = "75";
    if (chkTailor) chkTailor.checked = true;
    if (chkHr) chkHr.checked = true;
    if (chkPipeline) chkPipeline.checked = true;
    showToast("Preset Applied: Full Auto-Pilot Hunt across Bengaluru Tech Giants!", "info");
  } else if (presetType === 'target_companies') {
    if (chips[1]) chips[1].classList.add('active-bengaluru');
    if (rolesInput) rolesInput.value = "Software Engineer, Backend Developer, SDE";
    if (companiesInput) companiesInput.value = "Sandisk, Swiggy, Zepto, Razorpay";
    if (locInput) locInput.value = "Bengaluru, Karnataka, India";
    if (threshSelect) threshSelect.value = "70";
    if (chkTailor) chkTailor.checked = true;
    if (chkHr) chkHr.checked = true;
    if (chkPipeline) chkPipeline.checked = true;
    showToast("Preset Applied: Target Companies Deep Crawl & Scout!", "info");
  } else if (presetType === 'tailor_batch') {
    if (chips[2]) chips[2].classList.add('active-bengaluru');
    if (rolesInput) rolesInput.value = "Software Engineer, Python Developer";
    if (companiesInput) companiesInput.value = "";
    if (locInput) locInput.value = "Bengaluru, Karnataka, India";
    if (threshSelect) threshSelect.value = "65";
    if (chkTailor) chkTailor.checked = true;
    if (chkHr) chkHr.checked = false;
    if (chkPipeline) chkPipeline.checked = true;
    showToast("Preset Applied: Fast Resume Batch Tailoring!", "info");
  }
};

async function loadAgentInitialState() {
  try {
    // 1. Load LLM configuration
    const cfgRes = await fetch('/api/agent/config');
    const cfgData = await cfgRes.json();
    if (cfgData.success && cfgData.config) {
      const cfg = cfgData.config;
      const provSelect = document.getElementById('agent-llm-provider');
      const urlInput = document.getElementById('agent-llm-url');
      const modelInput = document.getElementById('agent-llm-model');
      const badge = document.getElementById('agent-llm-badge');

      if (provSelect) provSelect.value = cfg.provider || 'ollama';
      if (urlInput) urlInput.value = cfg.base_url || 'http://localhost:11434';
      if (modelInput) modelInput.value = cfg.model_name || 'llama3.2';
      if (badge) {
        badge.innerText = `⚡ LLM: ${(cfg.provider || 'Ollama').toUpperCase()} (${cfg.model_name || 'auto'})`;
      }
    }

    // 2. Load Agent status
    const statusRes = await fetch('/api/agent/status');
    const statusData = await statusRes.json();
    const s = statusData.status || statusData.agent;
    if (statusData.success && s) {
      updateAgentUI(s);
      if (s.state === 'running') {
        startAgentPolling();
      } else if (s.deliverables && s.deliverables.length > 0) {
        lastAgentDeliverables = s.deliverables;
        lastAgentHrLeads = s.hr_leads || [];
        renderAgentDeliverables(s);
      }
    }
  } catch (err) {
    console.error("Failed to load agent initial state:", err);
  }
}

async function testLocalModelConnection() {
  const btn = document.getElementById('btn-test-local-llm');
  const titleElem = document.getElementById('agent-llm-status-title');
  const descElem = document.getElementById('agent-llm-status-desc');
  const badge = document.getElementById('agent-llm-badge');

  const provider = document.getElementById('agent-llm-provider').value;
  const baseUrl = document.getElementById('agent-llm-url').value.trim();
  const modelName = document.getElementById('agent-llm-model').value.trim();

  const origBtnText = btn.innerHTML;
  btn.innerHTML = `<span>⏳ Probing ${escapeHtml(provider)}...</span>`;
  btn.disabled = true;

  titleElem.innerHTML = `🔍 Testing connection to <code>${escapeHtml(baseUrl)}</code>...`;
  descElem.innerText = "Sending ping and querying available models...";

  try {
    const res = await fetch('/api/agent/test-local-model', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider,
        base_url: baseUrl,
        model_name: modelName
      })
    });
    const data = await res.json();

    if (data.success && data.connected) {
      titleElem.innerHTML = `<span style="color: var(--accent-emerald);">✅ Local Engine Online & Ready!</span> (Provider: <b>${escapeHtml(provider)}</b>)`;
      
      let modelsHtml = "";
      if (data.available_models && data.available_models.length > 0) {
        modelsHtml = `<div style="margin-top: 0.5rem; font-size: 0.75rem;"><b>Detected Models:</b> ` +
          data.available_models.map(m => `<span class="filter-chip" style="font-size: 0.7rem; padding: 0.15rem 0.45rem; margin-right: 0.25rem;" onclick="document.getElementById('agent-llm-model').value='${escapeHtml(m)}';">${escapeHtml(m)}</span>`).join('') +
          `</div>`;
      }
      
      descElem.innerHTML = `Connected to <b>${escapeHtml(baseUrl)}</b>. Model active: <code>${escapeHtml(modelName || 'default')}</code>.${modelsHtml}`;
      if (badge) badge.innerText = `⚡ LLM: ${provider.toUpperCase()} (${modelName || 'online'})`;
      showToast(`Local ${provider} connected successfully!`, "success");
    } else {
      titleElem.innerHTML = `<span style="color: var(--accent-rose);">⚠️ Local Server Not Responding</span>`;
      descElem.innerHTML = `
        Cannot reach <code>${escapeHtml(baseUrl)}</code>.<br>
        • If using <b>Ollama</b>: Start it in terminal via <code>ollama run llama3.2</code> or <code>ollama serve</code>.<br>
        • If using <b>LM Studio</b>: Open LM Studio & click 'Start Local Server' (port 1234).<br>
        <span style="color: #fbbf24;">ℹ️ Don't worry: The agent will run with built-in heuristic ATS intelligence until the model is started.</span>
      `;
      showToast("Local model unreachable - Heuristic fallback active", "warning");
    }
  } catch (err) {
    titleElem.innerHTML = `<span style="color: var(--accent-rose);">❌ Network Error</span>`;
    descElem.innerText = err.message || "Failed to reach backend test route.";
    showToast("Error testing model connection", "error");
  } finally {
    btn.innerHTML = origBtnText;
    btn.disabled = false;
  }
}

async function saveAgentLlmConfig() {
  const provider = document.getElementById('agent-llm-provider').value;
  const baseUrl = document.getElementById('agent-llm-url').value.trim();
  const modelName = document.getElementById('agent-llm-model').value.trim();
  const badge = document.getElementById('agent-llm-badge');

  try {
    const res = await fetch('/api/agent/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: provider,
        base_url: baseUrl,
        model_name: modelName
      })
    });
    const data = await res.json();
    if (data.success) {
      if (badge) badge.innerText = `⚡ LLM: ${provider.toUpperCase()} (${modelName || 'auto'})`;
      showToast("Local model configuration saved!", "success");
    } else {
      showToast(data.error || "Failed to save config", "error");
    }
  } catch (err) {
    showToast("Error saving LLM config", "error");
  }
}

async function launchAgentMission(e) {
  if (e) e.preventDefault();

  const targetRoles = document.getElementById('agent-target-roles').value.trim();
  const targetCompanies = document.getElementById('agent-target-companies').value.trim();
  const targetLoc = document.getElementById('agent-target-loc').value.trim();
  const minThreshold = parseInt(document.getElementById('agent-min-threshold').value) || 75;
  const autoTailor = document.getElementById('agent-chk-tailor').checked;
  const autoHr = document.getElementById('agent-chk-hr').checked;
  const autoPipeline = document.getElementById('agent-chk-pipeline').checked;

  if (!targetRoles && !targetCompanies) {
    showToast("Please specify at least target roles or target companies", "warning");
    return;
  }

  // UI state transition
  document.getElementById('btn-launch-agent').style.display = 'none';
  document.getElementById('btn-stop-agent').style.display = 'inline-flex';
  
  const stateBadge = document.getElementById('agent-state-badge');
  stateBadge.className = 'agent-status-badge status-running';
  stateBadge.innerText = '⚡ Agent Running...';

  // Clear previous terminal and deliverables
  const terminal = document.getElementById('agent-live-terminal');
  if (terminal) {
    terminal.innerHTML = `<div class="terminal-line"><span class="t-time">${new Date().toLocaleTimeString()}</span><span class="t-level-info">[SYS]</span><span class="t-msg">Launching JobPulse Autonomous Mission...</span></div>`;
  }
  lastAgentLogCount = 0;
  document.getElementById('agent-results-container').style.display = 'none';

  try {
    const res = await fetch('/api/agent/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        target_roles: targetRoles,
        target_companies: targetCompanies,
        target_location: targetLoc,
        min_match_threshold: minThreshold,
        auto_tailor_cv: autoTailor,
        auto_discover_hr: autoHr,
        auto_apply_pipeline: autoPipeline
      })
    });

    const data = await res.json();
    if (data.success) {
      showToast("Mission started! Agent is operating autonomously in background.", "success");
      startAgentPolling();
    } else {
      showToast(data.error || "Failed to start agent mission", "error");
      resetAgentButtons();
    }
  } catch (err) {
    showToast("Error starting mission: " + err.message, "error");
    resetAgentButtons();
  }
}

async function stopAgentMission() {
  const stopBtn = document.getElementById('btn-stop-agent');
  stopBtn.disabled = true;
  stopBtn.innerText = "🛑 Aborting...";

  try {
    const res = await fetch('/api/agent/stop', { method: 'POST' });
    const data = await res.json();
    if (data.success) {
      showToast("Abort command sent to agent", "info");
      appendTerminalLine("SYS", "Abort signal acknowledged by user. Gracefully winding down...", "warning");
    }
  } catch (err) {
    showToast("Failed to abort mission", "error");
  }
}

function startAgentPolling() {
  if (agentPollingInterval) clearInterval(agentPollingInterval);
  agentPollingInterval = setInterval(pollAgentStatus, 1200);
  pollAgentStatus();
}

async function pollAgentStatus() {
  try {
    const res = await fetch('/api/agent/status');
    const data = await res.json();
    const s = data.status || data.agent;
    if (!data.success || !s) return;

    updateAgentUI(s);

    if (s.state !== 'running') {
      if (agentPollingInterval) {
        clearInterval(agentPollingInterval);
        agentPollingInterval = null;
      }
      resetAgentButtons();

      if (s.state === 'completed') {
        showToast("Agent mission completed successfully!", "success");
      } else if (s.state === 'aborted') {
        showToast("Agent mission aborted.", "info");
      } else if (s.state === 'error') {
        showToast("Agent mission encountered an error.", "error");
      }

      // If deliverables exist, render them
      if (s.deliverables && s.deliverables.length > 0) {
        lastAgentDeliverables = s.deliverables;
        lastAgentHrLeads = s.hr_leads || [];
        renderAgentDeliverables(s);
      }
    }
  } catch (err) {
    console.error("Error polling agent status:", err);
  }
}

function updateAgentUI(s) {
  // Update badge
  const badge = document.getElementById('agent-state-badge');
  if (badge) {
    badge.className = `agent-status-badge status-${s.state || 'idle'}`;
    if (s.state === 'running') badge.innerText = '⚡ Agent Running...';
    else if (s.state === 'completed') badge.innerText = '✅ Mission Complete';
    else if (s.state === 'aborted') badge.innerText = '🛑 Mission Aborted';
    else if (s.state === 'error') badge.innerText = '⚠️ Execution Error';
    else badge.innerText = '🟢 Agent Idle';
  }

  // Progress Bar
  const pct = Math.min(100, Math.max(0, s.progress_pct || 0));
  const fill = document.getElementById('agent-progress-fill');
  const pctElem = document.getElementById('agent-progress-pct');
  if (fill) fill.style.width = `${pct}%`;
  if (pctElem) pctElem.innerText = `${pct}%`;

  // Step labels
  const phaseLabel = document.getElementById('agent-current-step-label');
  const phaseText = document.getElementById('agent-current-step-text');
  if (phaseLabel && s.current_phase) phaseLabel.innerText = `Current Phase: ${s.current_phase}`;
  if (phaseText && s.current_step_text) phaseText.innerText = s.current_step_text;

  // Step Pills (1 to 6)
  const currentPhaseNum = s.phase_num || 0;
  for (let i = 1; i <= 6; i++) {
    const pillElem = document.getElementById(`pill-step-${i}`);
    if (pillElem) {
      pillElem.classList.remove('active', 'completed');
      if (i < currentPhaseNum) {
        pillElem.classList.add('completed');
      } else if (i === currentPhaseNum) {
        pillElem.classList.add('active');
      }
    }
  }

  // Live Terminal Logs
  if (s.logs && s.logs.length > lastAgentLogCount) {
    const newLogs = s.logs.slice(lastAgentLogCount);
    const terminal = document.getElementById('agent-live-terminal');
    if (terminal) {
      newLogs.forEach(line => {
        const div = document.createElement('div');
        div.className = 'terminal-line';
        
        const timeSpan = document.createElement('span');
        timeSpan.className = 't-time';
        timeSpan.innerText = line.timestamp || '';

        const levelSpan = document.createElement('span');
        const lvl = (line.level || 'info').toLowerCase();
        levelSpan.className = `t-level-${lvl}`;
        levelSpan.innerText = `[${(line.level || 'INFO').toUpperCase()}]`;

        const msgSpan = document.createElement('span');
        msgSpan.className = 't-msg';
        msgSpan.innerText = ` ${line.message}`;

        div.appendChild(timeSpan);
        div.appendChild(levelSpan);
        div.appendChild(msgSpan);
        terminal.appendChild(div);
      });
      terminal.scrollTop = terminal.scrollHeight;
    }
    lastAgentLogCount = s.logs.length;
  }
}

function appendTerminalLine(tag, msg, lvl = 'info') {
  const terminal = document.getElementById('agent-live-terminal');
  if (!terminal) return;
  const div = document.createElement('div');
  div.className = 'terminal-line';
  div.innerHTML = `<span class="t-time">${new Date().toLocaleTimeString()}</span><span class="t-level-${lvl}">[${tag}]</span><span class="t-msg"> ${escapeHtml(msg)}</span>`;
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
}

function resetAgentButtons() {
  const launchBtn = document.getElementById('btn-launch-agent');
  const stopBtn = document.getElementById('btn-stop-agent');
  if (launchBtn) launchBtn.style.display = 'inline-flex';
  if (stopBtn) {
    stopBtn.style.display = 'none';
    stopBtn.disabled = false;
    stopBtn.innerHTML = `<span>🛑 Abort Mission</span>`;
  }
}

function renderAgentDeliverables(status) {
  const container = document.getElementById('agent-results-container');
  if (!container) return;
  container.style.display = 'block';

  // Metrics
  const mScraped = document.getElementById('metric-scraped');
  const mEval = document.getElementById('metric-evaluated');
  const mHigh = document.getElementById('metric-high-matches');
  const mTailored = document.getElementById('metric-tailored');

  if (mScraped) mScraped.innerText = status.stats ? status.stats.vacancies_crawled : (status.deliverables.length * 2);
  if (mEval) mEval.innerText = status.stats ? status.stats.evaluated_count : status.deliverables.length;
  if (mHigh) mHigh.innerText = status.deliverables.length;
  if (mTailored) mTailored.innerText = status.stats ? status.stats.tailored_count : status.deliverables.filter(d => d.tailored_tex).length;

  // Deliverables Sheets Table
  renderAgentDeliverablesTable(status.deliverables);

  // HR Leads
  if (status.hr_leads && status.hr_leads.length > 0) {
    renderAgentHrLeads(status.hr_leads);
  }
}

function renderAgentDeliverablesTable(deliverables) {
  const container = document.getElementById('agent-jobs-table-container');
  if (!container) return;

  if (!deliverables || deliverables.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 2rem; color: var(--text-muted);">No qualified opportunities matched the threshold. Try lowering the threshold or broadening roles!</div>`;
    return;
  }

  container.innerHTML = `
    <table class="sheets-table">
      <thead>
        <tr>
          <th style="width: 95px;">Match</th>
          <th>Role Title</th>
          <th>Company</th>
          <th>Location</th>
          <th>Auto-Tailored Resume</th>
          <th style="text-align: right;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${deliverables.map(job => {
          const score = job.match_score || 75;
          let scoreClass = 'badge-match';
          if (score >= 80) scoreClass = 'badge-offer';
          else if (score >= 70) scoreClass = 'badge-ats';

          const texFile = job.tailored_tex;
          const pdfFile = job.pdf_filename;

          return `
            <tr>
              <td>
                <span class="badge ${scoreClass}" style="font-weight: 700; font-size: 0.8rem;">
                  ${score}% Match
                </span>
              </td>
              <td>
                <div style="font-weight: 600; color: #fff;">${escapeHtml(job.title)}</div>
                ${job.missing_keywords && job.missing_keywords.length ? `
                  <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 0.2rem;">
                    Target skills: ${escapeHtml(job.missing_keywords.slice(0, 3).join(', '))}
                  </div>
                ` : ''}
              </td>
              <td>
                <span style="color: var(--accent-cyan); font-weight: 600;">${escapeHtml(job.company)}</span>
              </td>
              <td style="color: var(--text-secondary); font-size: 0.825rem;">
                ${escapeHtml(job.location || 'Bengaluru, India')}
              </td>
              <td>
                ${texFile ? `
                  <div style="display: flex; gap: 0.4rem; align-items: center; flex-wrap: wrap;">
                    <button class="btn btn-secondary btn-sm" onclick="openAgentJobInLatex('${job.id || ''}', '${escapeHtml(texFile)}')" title="Edit this tailored LaTeX resume in CV Studio">
                      📄 Studio
                    </button>
                    <a href="/api/latex/download/${encodeURIComponent(texFile)}" class="btn btn-secondary btn-sm" style="color: var(--accent-emerald);" download title="Download .tex file">
                      📥 .tex
                    </a>
                    ${pdfFile ? `
                      <a href="/api/latex/download/${encodeURIComponent(pdfFile)}" class="btn btn-secondary btn-sm" style="color: var(--accent-cyan);" download title="Download PDF">
                        📥 PDF
                      </a>
                    ` : ''}
                  </div>
                ` : `<span style="font-size: 0.75rem; color: var(--text-muted);">Standard CV</span>`}
              </td>
              <td style="text-align: right;">
                <div style="display: flex; gap: 0.4rem; justify-content: flex-end;">
                  ${job.apply_url ? `
                    <a href="${escapeHtml(job.apply_url)}" target="_blank" class="btn btn-primary btn-sm">
                      Apply ↗
                    </a>
                  ` : ''}
                  <button class="btn btn-secondary btn-sm" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR Recruiters">
                    👥 HR
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

function renderAgentHrLeads(leads) {
  const section = document.getElementById('agent-hr-leads-section');
  const container = document.getElementById('agent-hr-leads-container');
  if (!section || !container) return;

  section.style.display = 'block';

  // Push to currentDiscoveredContacts so existing outreach modal can access
  leads.forEach(l => {
    if (!currentDiscoveredContacts.some(c => c.id === l.id)) {
      currentDiscoveredContacts.push(l);
    }
  });

  container.innerHTML = leads.map(l => {
    return `
      <div class="job-card" style="padding: 1rem; border-color: rgba(99, 102, 241, 0.3);">
        <div class="job-card-top" style="margin-bottom: 0.4rem;">
          <div>
            <div style="font-size: 1rem; font-weight: 700; color: #fff;">${escapeHtml(l.name)}</div>
            <div style="font-size: 0.8rem; color: var(--accent-cyan); font-weight: 500;">
              ${escapeHtml(l.role_category || 'Talent Acquisition')} @ ${escapeHtml(l.company)}
            </div>
          </div>
          <span class="badge badge-ats">Verified Recruiter</span>
        </div>
        <div style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.35; margin-bottom: 0.6rem;">
          ${escapeHtml(l.headline || '')}
        </div>
        ${l.predicted_email ? `
          <div style="font-size: 0.75rem; color: #94a3b8; margin-bottom: 0.6rem;">
            📧 <code>${escapeHtml(l.predicted_email)}</code>
          </div>
        ` : ''}
        <div class="job-card-actions" style="margin-top: 0.5rem;">
          <a href="${escapeHtml(l.profile_url || '#')}" target="_blank" class="btn btn-secondary btn-sm">
            🔗 LinkedIn ↗
          </a>
          <button class="btn btn-gradient btn-sm" onclick="openOutreachForContact('${l.id}')">
            ✉️ Referral Pitch
          </button>
        </div>
      </div>
    `;
  }).join('');
}

window.openAgentJobInLatex = async function(jobId, texFilename) {
  switchTab('tab-latex');
  try {
    const res = await fetch(`/api/latex/view/${encodeURIComponent(texFilename)}`);
    const data = await res.json();
    if (data.success && data.content) {
      document.getElementById('latex-code-output').value = data.content;
      lastGeneratedTexFilename = texFilename;
      renderCvPreview(data.content);
      showToast(`Loaded tailored resume: ${texFilename}`, "success");
    }
  } catch (err) {
    showToast("Opened LaTeX Studio. Ready to compile!", "info");
  }
};

// --- Tab 3: Pipeline (Sheets View & Kanban) ---
let selectedPipelineJobIds = new Set();
let pipelineViewMode = 'sheets';

async function initPipeline() {
  document.getElementById('btn-refresh-pipeline').addEventListener('click', loadPipeline);
  document.getElementById('pipeline-filter-status').addEventListener('change', loadPipeline);
  document.getElementById('pipeline-search-input').addEventListener('input', debounce(loadPipeline, 300));

  const sheetsBtn = document.getElementById('btn-view-sheets');
  const kanbanBtn = document.getElementById('btn-view-kanban');
  if (sheetsBtn && kanbanBtn) {
    sheetsBtn.addEventListener('click', () => {
      pipelineViewMode = 'sheets';
      sheetsBtn.classList.add('active');
      kanbanBtn.classList.remove('active');
      document.getElementById('pipeline-sheets-view').style.display = 'block';
      document.getElementById('kanban-board').style.display = 'none';
    });
    kanbanBtn.addEventListener('click', () => {
      pipelineViewMode = 'kanban';
      kanbanBtn.classList.add('active');
      sheetsBtn.classList.remove('active');
      document.getElementById('pipeline-sheets-view').style.display = 'none';
      document.getElementById('kanban-board').style.display = 'grid';
    });
  }

  // Pipeline Batch Delete
  const batchDeleteBtn = document.getElementById('btn-pipeline-batch-delete');
  if (batchDeleteBtn) {
    batchDeleteBtn.addEventListener('click', async () => {
      const ids = Array.from(selectedPipelineJobIds);
      if (ids.length === 0) return;
      if (!confirm(`Are you sure you want to delete ${ids.length} tracked application(s)?`)) return;

      try {
        const res = await fetch('/api/jobs/batch-delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Deleted ${data.deleted_count || ids.length} applications from tracker`, "info");
          selectedPipelineJobIds.clear();
          loadPipeline();
        } else {
          showToast(data.error || "Batch delete failed", "error");
        }
      } catch (err) {
        showToast("Error executing batch delete", "error");
      }
    });
  }

  // Pipeline Batch Status Dropdown
  const batchStatusSelect = document.getElementById('pipeline-batch-status-select');
  if (batchStatusSelect) {
    batchStatusSelect.addEventListener('change', async () => {
      const newStatus = batchStatusSelect.value;
      const ids = Array.from(selectedPipelineJobIds);
      if (!newStatus || ids.length === 0) return;

      try {
        const res = await fetch('/api/jobs/batch-status', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ job_ids: ids, status: newStatus })
        });
        const data = await res.json();
        if (data.success) {
          showToast(`Updated ${ids.length} applications to '${newStatus}'`, "success");
          batchStatusSelect.selectedIndex = 0;
          selectedPipelineJobIds.clear();
          loadPipeline();
        }
      } catch (err) {
        showToast("Error updating statuses", "error");
      }
    });
  }

  // Clear pipeline selection
  const clearSelBtn = document.getElementById('btn-pipeline-clear-sel');
  if (clearSelBtn) {
    clearSelBtn.addEventListener('click', () => {
      selectedPipelineJobIds.clear();
      document.querySelectorAll('.pipeline-row-chk').forEach(c => c.checked = false);
      document.querySelectorAll('#pipeline-sheets-view tr').forEach(r => r.classList.remove('row-selected'));
      const batchBar = document.getElementById('pipeline-batch-bar');
      if (batchBar) batchBar.style.display = 'none';
      const selCount = document.getElementById('pipeline-selected-count');
      if (selCount) selCount.innerText = '0';
    });
  }

  const pushSheetsBtn = document.getElementById('btn-pipeline-sync-sheets');
  if (pushSheetsBtn) pushSheetsBtn.addEventListener('click', syncSheets);
  const syncBtn = document.getElementById('btn-sync-sheets');
  if (syncBtn) syncBtn.addEventListener('click', syncSheets);

  // Pipeline CSV Export
  const exportPipelineCsvBtn = document.getElementById('btn-export-pipeline-csv');
  if (exportPipelineCsvBtn) {
    exportPipelineCsvBtn.addEventListener('click', () => {
      exportJobsToCsv('JobPulse_Pipeline_Applications.csv', allTrackedJobs);
    });
  }
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
      renderPipelineSheets(data.jobs);
      renderKanban(data.jobs);
      initStats();
    }
  } catch (err) {
    console.error("Failed to load pipeline:", err);
  }
}

function renderPipelineSheets(jobs) {
  const container = document.getElementById('pipeline-sheets-view');
  const batchBar = document.getElementById('pipeline-batch-bar');
  const countElem = document.getElementById('pipeline-selected-count');

  selectedPipelineJobIds.clear();
  if (batchBar) batchBar.style.display = 'none';
  if (countElem) countElem.innerText = '0';

  if (!jobs || jobs.length === 0) {
    container.innerHTML = `<div style="text-align: center; padding: 3rem 1rem; color: var(--text-muted);">No tracked applications found. Scrape or add jobs to populate your pipeline!</div>`;
    return;
  }

  container.innerHTML = `
    <table class="sheets-table">
      <thead>
        <tr>
          <th class="sheets-checkbox-cell">
            <input type="checkbox" id="pipeline-select-all" class="sheets-custom-checkbox" title="Select All">
          </th>
          <th style="min-width: 140px;">Company</th>
          <th style="min-width: 220px;">Role / Title</th>
          <th style="min-width: 130px;">Location</th>
          <th style="min-width: 130px;">Status</th>
          <th style="min-width: 120px;">Source / ATS</th>
          <th style="min-width: 100px;">Date Added</th>
          <th style="min-width: 110px;">Portal Link</th>
          <th style="min-width: 160px;">Actions</th>
        </tr>
      </thead>
      <tbody>
        ${jobs.map(job => {
          const st = job.status || 'Wishlist';
          return `
            <tr id="pipeline-row-${job.id}" data-job-id="${job.id}">
              <td class="sheets-checkbox-cell">
                <input type="checkbox" class="sheets-custom-checkbox pipeline-row-chk" data-job-id="${job.id}">
              </td>
              <td>
                <div class="sheets-company-cell">
                  <span>🏢</span>
                  <span>${escapeHtml(job.company)}</span>
                </div>
              </td>
              <td>
                <a href="${escapeHtml(job.job_url || '#')}" target="_blank" class="sheets-title-link" title="${escapeHtml(job.title)}">
                  ${escapeHtml(job.title)}
                </a>
              </td>
              <td>
                <div class="sheets-location-cell" title="${escapeHtml(job.location || 'Remote')}">
                  📍 ${escapeHtml(job.location || 'Remote')}
                </div>
              </td>
              <td>
                <select class="sheets-status-dropdown" data-status="${st}" onchange="changeJobStatus('${job.id}', this.value)">
                  <option value="Wishlist" ${st === 'Wishlist' ? 'selected' : ''}>🌟 Wishlist</option>
                  <option value="Applied" ${st === 'Applied' ? 'selected' : ''}>🚀 Applied</option>
                  <option value="Interviewing" ${st === 'Interviewing' ? 'selected' : ''}>💬 Interviewing</option>
                  <option value="Offer" ${st === 'Offer' ? 'selected' : ''}>🏆 Offer</option>
                  <option value="Rejected" ${st === 'Rejected' ? 'selected' : ''}>❌ Rejected</option>
                </select>
              </td>
              <td>
                <span class="badge badge-source" style="font-size: 0.72rem;">${escapeHtml(job.ats_provider || job.source || 'Scraper')}</span>
              </td>
              <td style="font-size: 0.75rem; color: var(--text-muted);">
                ${escapeHtml((job.created_at || '').slice(0, 10) || 'Recent')}
              </td>
              <td>
                ${job.career_page_url || job.job_url ? `
                  <a href="${escapeHtml(job.career_page_url || job.job_url)}" target="_blank" class="btn-icon-sm" style="color: var(--accent-cyan);" title="Open application link">
                    ↗ Link
                  </a>` : '<span style="color: var(--text-muted); font-size: 0.75rem;">—</span>'}
              </td>
              <td>
                <div class="sheets-actions-cell">
                  <button class="btn-icon-sm" onclick="findCompanyContacts('${escapeHtml(job.company)}')" title="Find HR contacts">
                    👥 HR
                  </button>
                  <button class="btn-icon-sm" onclick="tailorForJob('${job.id}')" title="Tailor LaTeX CV">
                    📄 CV
                  </button>
                  <button class="btn-icon-sm btn-danger" onclick="deleteJob('${job.id}')" title="Delete application">
                    🗑️
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;

  // Attach pipeline selection listeners
  initPipelineSelectionEvents();
}

function initPipelineSelectionEvents() {
  const selectAll = document.getElementById('pipeline-select-all');
  const rowCheckboxes = document.querySelectorAll('.pipeline-row-chk');
  const batchBar = document.getElementById('pipeline-batch-bar');
  const countElem = document.getElementById('pipeline-selected-count');

  function updateBatchBar() {
    const count = selectedPipelineJobIds.size;
    if (countElem) countElem.innerText = count;
    if (batchBar) batchBar.style.display = count > 0 ? 'flex' : 'none';
    if (selectAll) {
      selectAll.checked = count > 0 && count === rowCheckboxes.length;
      selectAll.indeterminate = count > 0 && count < rowCheckboxes.length;
    }
  }

  if (selectAll) {
    selectAll.addEventListener('change', () => {
      const isChecked = selectAll.checked;
      rowCheckboxes.forEach(chk => {
        chk.checked = isChecked;
        const jid = chk.dataset.jobId;
        const row = document.getElementById(`pipeline-row-${jid}`);
        if (isChecked) {
          selectedPipelineJobIds.add(jid);
          if (row) row.classList.add('row-selected');
        } else {
          selectedPipelineJobIds.delete(jid);
          if (row) row.classList.remove('row-selected');
        }
      });
      updateBatchBar();
    });
  }

  rowCheckboxes.forEach(chk => {
    chk.addEventListener('change', () => {
      const jid = chk.dataset.jobId;
      const row = document.getElementById(`pipeline-row-${jid}`);
      if (chk.checked) {
        selectedPipelineJobIds.add(jid);
        if (row) row.classList.add('row-selected');
      } else {
        selectedPipelineJobIds.delete(jid);
        if (row) row.classList.remove('row-selected');
      }
      updateBatchBar();
    });
  });
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

async function inspectJobAi(jobId) {
  switchTab('tab-ai');
  try {
    const res = await fetch(`/api/jobs/${jobId}`);
    const data = await res.json();
    if (data.success && data.job) {
      const job = data.job;
      const jdInput = document.getElementById('ai-jd-input');
      if (jdInput) {
        jdInput.value = `${job.title} at ${job.company}\nLocation: ${job.location || 'Bengaluru'}\nSource: ${job.source || ''}\n\n${job.description || 'Job details and requirements for ' + job.title + ' at ' + job.company}`;
      }
      const analyzeBtn = document.getElementById('btn-analyze-jd');
      if (analyzeBtn) {
        analyzeBtn.click();
      }
      showToast(`Analyzing JD for ${job.title} with ATS AI engine...`, "info");
    }
  } catch (err) {
    console.error("Error inspecting job with AI:", err);
  }
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
