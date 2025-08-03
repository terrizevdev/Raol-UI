import { Chart } from "@/components/ui/chart"
// Modern API Documentation Platform
import bootstrap from "bootstrap" // Import bootstrap

class APIDocumentation {
  constructor() {
    this.settings = {}
    this.currentSection = "home"
    this.sidebarCollapsed = false
    this.theme = localStorage.getItem("theme") || "light"
    this.searchTimeout = null
    this.monitoringInterval = null
    this.metricsChart = null
    this.notifications = []

    this.init()
  }

  async init() {
    try {
      await this.loadSettings()
      await this.loadNotifications()
      this.setupEventListeners()
      this.initializeTheme()
      this.populateContent()
      this.renderAPICards()
      this.startMonitoring()
      this.hideLoadingScreen()
      this.handleURLHash()
    } catch (error) {
      console.error("Initialization error:", error)
      this.showToast("Failed to initialize application", "error")
      this.hideLoadingScreen()
    }
  }

  async loadSettings() {
    try {
      const response = await fetch("/api/settings")
      if (!response.ok) throw new Error("Failed to load settings")
      this.settings = await response.json()
    } catch (error) {
      console.error("Error loading settings:", error)
      throw error
    }
  }

  async loadNotifications() {
    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) throw new Error("Failed to load notifications")
      this.notifications = await response.json()
      this.updateNotificationBadge()
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  setupEventListeners() {
    // Mobile menu toggle
    const mobileMenuToggle = document.getElementById("mobileMenuToggle")
    if (mobileMenuToggle) {
      mobileMenuToggle.addEventListener("click", () => this.toggleMobileMenu())
    }

    // Sidebar toggle
    const sidebarToggle = document.getElementById("sidebarToggle")
    if (sidebarToggle) {
      sidebarToggle.addEventListener("click", () => this.toggleSidebar())
    }

    // Navigation links
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.addEventListener("click", (e) => {
        e.preventDefault()
        const section = link.dataset.section
        this.navigateToSection(section)
      })
    })

    // Theme toggle
    const themeBtn = document.getElementById("themeBtn")
    if (themeBtn) {
      themeBtn.addEventListener("click", () => this.toggleTheme())
    }

    // Search functionality
    const searchInput = document.getElementById("searchInput")
    const searchClear = document.getElementById("searchClear")

    if (searchInput) {
      searchInput.addEventListener("input", (e) => this.handleSearch(e.target.value))
      searchInput.addEventListener("focus", () => this.showSearchSuggestions())
      searchInput.addEventListener("blur", () => {
        setTimeout(() => this.hideSearchSuggestions(), 200)
      })
    }

    if (searchClear) {
      searchClear.addEventListener("click", () => this.clearSearch())
    }

    // Notification button
    const notificationBtn = document.getElementById("notificationBtn")
    if (notificationBtn) {
      notificationBtn.addEventListener("click", () => this.showNotifications())
    }

    // Hero action buttons
    document.querySelectorAll("[data-action]").forEach((btn) => {
      btn.addEventListener("click", (e) => {
        const action = e.target.closest("[data-action]").dataset.action
        this.handleHeroAction(action)
      })
    })

    // API card clicks
    document.addEventListener("click", (e) => {
      const apiCard = e.target.closest(".api-card")
      if (apiCard) {
        this.openAPIModal(apiCard.dataset)
      }
    })

    // Window resize
    window.addEventListener("resize", () => this.handleResize())

    // Hash change
    window.addEventListener("hashchange", () => this.handleURLHash())
  }

  initializeTheme() {
    document.documentElement.setAttribute("data-theme", this.theme)
    this.updateThemeIcon()
  }

  toggleTheme() {
    this.theme = this.theme === "light" ? "dark" : "light"
    localStorage.setItem("theme", this.theme)
    document.documentElement.setAttribute("data-theme", this.theme)
    this.updateThemeIcon()
    this.showToast(`Switched to ${this.theme} theme`, "success")
  }

  updateThemeIcon() {
    const lightIcon = document.querySelector(".light-icon")
    const darkIcon = document.querySelector(".dark-icon")

    if (this.theme === "dark") {
      lightIcon?.style.setProperty("opacity", "0")
      darkIcon?.style.setProperty("opacity", "1")
    } else {
      lightIcon?.style.setProperty("opacity", "1")
      darkIcon?.style.setProperty("opacity", "0")
    }
  }

  toggleSidebar() {
    const sidebar = document.getElementById("sidebar")
    this.sidebarCollapsed = !this.sidebarCollapsed

    if (this.sidebarCollapsed) {
      sidebar?.classList.add("collapsed")
    } else {
      sidebar?.classList.remove("collapsed")
    }

    localStorage.setItem("sidebarCollapsed", this.sidebarCollapsed)
  }

  toggleMobileMenu() {
    const sidebar = document.getElementById("sidebar")
    sidebar?.classList.toggle("open")
  }

  navigateToSection(section) {
    // Update active nav link
    document.querySelectorAll(".nav-link").forEach((link) => {
      link.classList.remove("active")
    })
    document.querySelector(`[data-section="${section}"]`)?.classList.add("active")

    // Show/hide sections
    document.querySelectorAll(".content-section").forEach((sec) => {
      sec.classList.remove("active")
    })
    document.getElementById(section)?.classList.add("active")

    this.currentSection = section
    window.location.hash = section

    // Close mobile menu
    document.getElementById("sidebar")?.classList.remove("open")

    // Load section-specific data
    if (section === "monitoring") {
      this.initializeMonitoring()
    }
  }

  handleURLHash() {
    const hash = window.location.hash.slice(1)
    if (hash && document.getElementById(hash)) {
      this.navigateToSection(hash)
    }
  }

  handleHeroAction(action) {
    switch (action) {
      case "explore-apis":
        this.navigateToSection("apis")
        break
      case "view-docs":
        this.navigateToSection("docs")
        break
    }
  }

  handleSearch(query) {
    clearTimeout(this.searchTimeout)
    const searchClear = document.getElementById("searchClear")

    if (query.length > 0) {
      searchClear?.classList.add("visible")
      this.searchTimeout = setTimeout(() => this.performSearch(query), 300)
    } else {
      searchClear?.classList.remove("visible")
      this.clearSearchResults()
    }
  }

  performSearch(query) {
    const apiCards = document.querySelectorAll(".api-card")
    const docCards = document.querySelectorAll(".doc-card")
    let hasResults = false

    // Search API cards
    apiCards.forEach((card) => {
      const title = card.querySelector(".api-title")?.textContent.toLowerCase() || ""
      const description = card.querySelector(".api-description")?.textContent.toLowerCase() || ""
      const matches = title.includes(query.toLowerCase()) || description.includes(query.toLowerCase())

      if (matches) {
        card.style.display = "block"
        hasResults = true
      } else {
        card.style.display = "none"
      }
    })

    // Search documentation cards
    docCards.forEach((card) => {
      const title = card.querySelector("h3")?.textContent.toLowerCase() || ""
      const description = card.querySelector("p")?.textContent.toLowerCase() || ""
      const matches = title.includes(query.toLowerCase()) || description.includes(query.toLowerCase())

      if (matches) {
        card.style.display = "block"
        hasResults = true
      } else {
        card.style.display = "none"
      }
    })

    if (!hasResults) {
      this.showNoResults(query)
    }
  }

  clearSearch() {
    const searchInput = document.getElementById("searchInput")
    const searchClear = document.getElementById("searchClear")

    if (searchInput) searchInput.value = ""
    searchClear?.classList.remove("visible")
    this.clearSearchResults()
  }

  clearSearchResults() {
    document.querySelectorAll(".api-card, .doc-card").forEach((card) => {
      card.style.display = "block"
    })
    this.hideNoResults()
  }

  showNoResults(query) {
    // Implementation for showing no results message
    console.log(`No results found for: ${query}`)
  }

  hideNoResults() {
    // Implementation for hiding no results message
  }

  showSearchSuggestions() {
    // Implementation for search suggestions
  }

  hideSearchSuggestions() {
    // Implementation for hiding search suggestions
  }

  populateContent() {
    if (!this.settings || !Object.keys(this.settings).length) return

    // Update page title and meta
    document.title = `${this.settings.name || "Raol Api'S"} - Modern API Platform`

    // Update sidebar title
    const sidebarTitle = document.getElementById("sidebarTitle")
    if (sidebarTitle) sidebarTitle.textContent = this.settings.name || "API"

    // Update version badge
    const versionBadge = document.getElementById("versionBadge")
    if (versionBadge) versionBadge.textContent = this.settings.version || "v2.0"

    // Update hero content
    const heroTitle = document.getElementById("heroTitle")
    const heroDescription = document.getElementById("heroDescription")

    if (heroTitle) heroTitle.textContent = this.settings.name || "Raol Api'S"
    if (heroDescription) {
      heroDescription.textContent =
        this.settings.description ||
        "Experience the next generation of API documentation with real-time monitoring, interactive testing, and comprehensive system insights."
    }

    // Update hero banner
    const heroBanner = document.getElementById("heroBanner")
    if (heroBanner && this.settings.bannerImage) {
      heroBanner.src = this.settings.bannerImage
      heroBanner.alt = `${this.settings.name} Banner`
    }

    // Update total APIs count
    const totalApis =
      this.settings.categories?.reduce((total, category) => total + (category.items?.length || 0), 0) || 0
    const totalApisElement = document.getElementById("totalApis")
    if (totalApisElement) totalApisElement.textContent = totalApis
  }

  renderAPICards() {
    const apiGrid = document.getElementById("apiGrid")
    const categoryTabs = document.getElementById("categoryTabs")

    if (!apiGrid || !this.settings.categories) return

    // Clear existing content
    apiGrid.innerHTML = ""

    // Create category tabs
    if (categoryTabs) {
      categoryTabs.innerHTML = '<button class="filter-tab active" data-category="all">All APIs</button>'

      this.settings.categories.forEach((category) => {
        const tab = document.createElement("button")
        tab.className = "filter-tab"
        tab.dataset.category = category.name.toLowerCase().replace(/\s+/g, "-")
        tab.textContent = category.name
        categoryTabs.appendChild(tab)
      })

      // Add tab click listeners
      categoryTabs.addEventListener("click", (e) => {
        if (e.target.classList.contains("filter-tab")) {
          this.filterAPIsByCategory(e.target.dataset.category)

          // Update active tab
          categoryTabs.querySelectorAll(".filter-tab").forEach((tab) => tab.classList.remove("active"))
          e.target.classList.add("active")
        }
      })
    }

    // Render API cards
    this.settings.categories.forEach((category) => {
      category.items?.forEach((api) => {
        const card = this.createAPICard(api, category.name)
        apiGrid.appendChild(card)
      })
    })
  }

  createAPICard(api, categoryName) {
    const card = document.createElement("div")
    card.className = "api-card"
    card.dataset.category = categoryName.toLowerCase().replace(/\s+/g, "-")
    card.dataset.name = api.name
    card.dataset.description = api.desc
    card.dataset.path = api.path
    card.dataset.status = api.status || "ready"
    card.dataset.params = JSON.stringify(api.params || {})

    const statusClass = api.status === "ready" ? "ready" : api.status === "beta" ? "beta" : "deprecated"

    card.innerHTML = `
      <div class="api-card-header">
        <h3 class="api-title">${api.name}</h3>
        <span class="api-status ${statusClass}">${api.status || "ready"}</span>
      </div>
      <p class="api-description">${api.desc}</p>
      <div class="api-meta">
        <span class="api-method">GET</span>
        <span class="api-category">${categoryName}</span>
      </div>
    `

    return card
  }

  filterAPIsByCategory(category) {
    const apiCards = document.querySelectorAll(".api-card")

    apiCards.forEach((card) => {
      if (category === "all" || card.dataset.category === category) {
        card.style.display = "block"
      } else {
        card.style.display = "none"
      }
    })
  }

  async openAPIModal(apiData) {
    const modal = new bootstrap.Modal(document.getElementById("apiModal"))
    const modalLabel = document.getElementById("apiModalLabel")
    const apiDescription = document.getElementById("apiDescription")
    const apiEndpoint = document.getElementById("apiEndpoint")
    const apiStatusBadge = document.getElementById("apiStatusBadge")
    const apiTesting = document.getElementById("apiTesting")
    const testApiBtn = document.getElementById("testApiBtn")

    // Populate modal content
    if (modalLabel) modalLabel.textContent = apiData.name
    if (apiDescription) apiDescription.textContent = apiData.description
    if (apiEndpoint) apiEndpoint.textContent = `${window.location.origin}${apiData.path}`
    if (apiStatusBadge) {
      apiStatusBadge.textContent = apiData.status || "ready"
      apiStatusBadge.className = `api-status-badge ${apiData.status || "ready"}`
    }

    // Setup testing interface
    if (apiTesting && apiData.params) {
      const params = JSON.parse(apiData.params)
      this.setupAPITesting(apiTesting, params, testApiBtn)
    } else if (testApiBtn) {
      testApiBtn.style.display = "none"
    }

    // Setup copy buttons
    this.setupCopyButtons()

    modal.show()
  }

  setupAPITesting(container, params, testBtn) {
    if (!params || Object.keys(params).length === 0) {
      container.innerHTML = '<p class="text-muted">No parameters required for this API.</p>'
      if (testBtn) testBtn.style.display = "none"
      return
    }

    let html = "<h6>Parameters</h6>"
    Object.entries(params).forEach(([key, description]) => {
      html += `
        <div class="param-group">
          <label for="param-${key}">${key} <span class="text-danger">*</span></label>
          <input type="text" id="param-${key}" class="form-control" 
                 placeholder="${description}" data-param="${key}" required>
        </div>
      `
    })

    container.innerHTML = html

    if (testBtn) {
      testBtn.style.display = "block"
      testBtn.onclick = () => this.testAPI()
    }
  }

  async testAPI() {
    const apiEndpoint = document.getElementById("apiEndpoint")?.textContent
    const paramInputs = document.querySelectorAll("[data-param]")
    const apiResponse = document.getElementById("apiResponse")
    const apiLoading = document.getElementById("apiLoading")
    const responseContent = document.getElementById("responseContent")

    if (!apiEndpoint) return

    // Show loading
    if (apiLoading) apiLoading.style.display = "block"
    if (apiResponse) apiResponse.style.display = "none"

    try {
      // Build URL with parameters
      const url = new URL(apiEndpoint)
      paramInputs.forEach((input) => {
        if (input.value.trim()) {
          url.searchParams.set(input.dataset.param, input.value.trim())
        }
      })

      const response = await fetch(url.toString())
      const contentType = response.headers.get("content-type")

      let responseData
      if (contentType?.includes("application/json")) {
        responseData = await response.json()
        if (responseContent) {
          responseContent.textContent = JSON.stringify(responseData, null, 2)
        }
      } else if (contentType?.includes("image/")) {
        responseData = "Image response received"
        if (responseContent) {
          responseContent.innerHTML = `<img src="${url.toString()}" alt="API Response" style="max-width: 100%; height: auto;">`
        }
      } else {
        responseData = await response.text()
        if (responseContent) {
          responseContent.textContent = responseData
        }
      }

      // Show response
      if (apiResponse) apiResponse.style.display = "block"
      this.showToast("API test completed successfully", "success")
    } catch (error) {
      console.error("API test error:", error)
      if (responseContent) {
        responseContent.textContent = `Error: ${error.message}`
      }
      if (apiResponse) apiResponse.style.display = "block"
      this.showToast("API test failed", "error")
    } finally {
      if (apiLoading) apiLoading.style.display = "none"
    }
  }

  setupCopyButtons() {
    const copyEndpoint = document.getElementById("copyEndpoint")
    const copyResponse = document.getElementById("copyResponse")

    if (copyEndpoint) {
      copyEndpoint.onclick = () => {
        const endpoint = document.getElementById("apiEndpoint")?.textContent
        if (endpoint) {
          this.copyToClipboard(endpoint)
          this.showToast("Endpoint copied to clipboard", "success")
        }
      }
    }

    if (copyResponse) {
      copyResponse.onclick = () => {
        const response = document.getElementById("responseContent")?.textContent
        if (response) {
          this.copyToClipboard(response)
          this.showToast("Response copied to clipboard", "success")
        }
      }
    }
  }

  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text)
    } catch (error) {
      // Fallback for older browsers
      const textArea = document.createElement("textarea")
      textArea.value = text
      document.body.appendChild(textArea)
      textArea.select()
      document.execCommand("copy")
      document.body.removeChild(textArea)
    }
  }

  startMonitoring() {
    this.updateSystemStats()
    this.monitoringInterval = setInterval(() => {
      this.updateSystemStats()
    }, 5000) // Update every 5 seconds
  }

  async updateSystemStats() {
    try {
      const response = await fetch("/api/system/overview")
      if (!response.ok) throw new Error("Failed to fetch system stats")

      const data = await response.json()
      if (data.status && data.data) {
        this.updateHeaderStats(data.data)
        this.updateDashboardStats(data.data)

        if (this.currentSection === "monitoring") {
          this.updateMonitoringSection(data.data)
        }
      }
    } catch (error) {
      console.error("Error updating system stats:", error)
    }
  }

  updateHeaderStats(data) {
    const uptimeStat = document.getElementById("uptimeStat")
    const cpuStat = document.getElementById("cpuStat")
    const ramStat = document.getElementById("ramStat")

    if (uptimeStat) {
      uptimeStat.querySelector("span").textContent = data.system.uptime
    }
    if (cpuStat) {
      cpuStat.querySelector("span").textContent = `${data.cpu.usage.toFixed(1)}%`
    }
    if (ramStat) {
      ramStat.querySelector("span").textContent = `${data.memory.system.usagePercent}%`
    }
  }

  updateDashboardStats(data) {
    const systemUptime = document.getElementById("systemUptime")
    const responseTime = document.getElementById("responseTime")

    if (systemUptime) {
      systemUptime.textContent = data.system.uptime
    }
    if (responseTime) {
      responseTime.textContent = `${data.performance.responseTime || 0}ms`
    }
  }

  initializeMonitoring() {
    if (this.currentSection !== "monitoring") return

    // Initialize charts and detailed monitoring
    this.initializeMetricsChart()
    this.updateDetailedMonitoring()
  }

  async updateMonitoringSection(data) {
    // Update system info
    const platformInfo = document.getElementById("platformInfo")
    const archInfo = document.getElementById("archInfo")
    const nodeVersion = document.getElementById("nodeVersion")
    const detailedUptime = document.getElementById("detailedUptime")

    if (platformInfo) platformInfo.textContent = data.system.platform
    if (archInfo) archInfo.textContent = data.system.architecture
    if (nodeVersion) nodeVersion.textContent = data.system.nodeVersion
    if (detailedUptime) detailedUptime.textContent = data.system.uptime

    // Update CPU monitoring
    const cpuUsage = document.getElementById("cpuUsage")
    const cpuPercentage = document.getElementById("cpuPercentage")
    const cpuCores = document.getElementById("cpuCores")
    const cpuModel = document.getElementById("cpuModel")

    if (cpuUsage) cpuUsage.textContent = `${data.cpu.usage.toFixed(1)}%`
    if (cpuPercentage) cpuPercentage.textContent = `${data.cpu.usage.toFixed(1)}%`
    if (cpuCores) cpuCores.textContent = data.cpu.cores
    if (cpuModel) cpuModel.textContent = data.cpu.model

    // Update CPU progress ring
    this.updateProgressRing("cpuProgress", data.cpu.usage)

    // Update Memory monitoring
    const memoryUsage = document.getElementById("memoryUsage")
    const memoryPercentage = document.getElementById("memoryPercentage")
    const memoryUsed = document.getElementById("memoryUsed")
    const memoryTotal = document.getElementById("memoryTotal")

    if (memoryUsage) memoryUsage.textContent = `${data.memory.system.usagePercent}%`
    if (memoryPercentage) memoryPercentage.textContent = `${data.memory.system.usagePercent}%`
    if (memoryUsed) memoryUsed.textContent = data.memory.system.used
    if (memoryTotal) memoryTotal.textContent = data.memory.system.total

    // Update Memory progress ring
    this.updateProgressRing("memoryProgress", data.memory.system.usagePercent)
  }

  updateProgressRing(elementId, percentage) {
    const progressRing = document.getElementById(elementId)
    if (!progressRing) return

    const circle = progressRing.querySelector(".progress-ring-circle")
    if (!circle) return

    const radius = 50
    const circumference = 2 * Math.PI * radius
    const offset = circumference - (percentage / 100) * circumference

    circle.style.strokeDasharray = circumference
    circle.style.strokeDashoffset = offset
  }

  initializeMetricsChart() {
    const canvas = document.getElementById("metricsChart")
    if (!canvas) return

    const ctx = canvas.getContext("2d")

    if (this.metricsChart) {
      this.metricsChart.destroy()
    }

    this.metricsChart = new Chart(ctx, {
      type: "line",
      data: {
        labels: [],
        datasets: [
          {
            label: "CPU Usage (%)",
            data: [],
            borderColor: "rgb(99, 102, 241)",
            backgroundColor: "rgba(99, 102, 241, 0.1)",
            tension: 0.4,
          },
          {
            label: "Memory Usage (%)",
            data: [],
            borderColor: "rgb(16, 185, 129)",
            backgroundColor: "rgba(16, 185, 129, 0.1)",
            tension: 0.4,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            max: 100,
          },
        },
        plugins: {
          legend: {
            position: "top",
          },
        },
      },
    })
  }

  updateNotificationBadge() {
    const badge = document.getElementById("notificationBadge")
    if (!badge) return

    const unreadCount = this.notifications.filter((n) => !n.read).length
    if (unreadCount > 0) {
      badge.classList.add("active")
      badge.textContent = unreadCount > 9 ? "9+" : unreadCount
    } else {
      badge.classList.remove("active")
    }
  }

  showNotifications() {
    const unreadNotifications = this.notifications.filter((n) => !n.read)

    if (unreadNotifications.length === 0) {
      this.showToast("No new notifications", "info")
      return
    }

    unreadNotifications.forEach((notification) => {
      this.showToast(notification.message, "info", notification.title)
      notification.read = true
    })

    this.updateNotificationBadge()
  }

  showToast(message, type = "info", title = "Notification") {
    const toast = document.getElementById("toast")
    const toastTitle = toast?.querySelector(".toast-title")
    const toastBody = toast?.querySelector(".toast-body")
    const toastIcon = toast?.querySelector(".toast-icon")

    if (!toast) return

    // Update content
    if (toastTitle) toastTitle.textContent = title
    if (toastBody) toastBody.textContent = message

    // Update icon based on type
    if (toastIcon) {
      const iconClasses = {
        success: "fas fa-check-circle text-success",
        error: "fas fa-exclamation-circle text-danger",
        warning: "fas fa-exclamation-triangle text-warning",
        info: "fas fa-info-circle text-info",
      }
      toastIcon.className = `toast-icon me-2 ${iconClasses[type] || iconClasses.info}`
    }

    // Show toast
    const bsToast = new bootstrap.Toast(toast)
    bsToast.show()
  }

  handleResize() {
    // Handle responsive behavior
    const sidebar = document.getElementById("sidebar")
    if (window.innerWidth <= 1024) {
      sidebar?.classList.remove("open")
    }
  }

  hideLoadingScreen() {
    const loadingScreen = document.getElementById("loadingScreen")
    if (loadingScreen) {
      loadingScreen.classList.add("fade-out")
      setTimeout(() => {
        loadingScreen.style.display = "none"
      }, 500)
    }
  }

  destroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval)
    }
    if (this.metricsChart) {
      this.metricsChart.destroy()
    }
  }
}

// Initialize the application when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  window.apiDoc = new APIDocumentation()
})

// Handle page unload
window.addEventListener("beforeunload", () => {
  if (window.apiDoc) {
    window.apiDoc.destroy()
  }
})
