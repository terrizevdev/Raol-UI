// Modern API Documentation Script - Enhanced for Swagger-like Experience
document.addEventListener("DOMContentLoaded", async () => {
  // DOM Element Selectors
  const DOM = {
    loadingScreen: document.getElementById("loadingScreen"),
    body: document.body,
    sideNav: document.querySelector(".side-nav"),
    mainWrapper: document.querySelector(".main-wrapper"),
    menuToggle: document.querySelector(".menu-toggle"),
    themeToggle: document.getElementById("themeToggle"),
    searchInput: document.getElementById("searchInput"),
    clearSearchBtn: document.getElementById("clearSearch"),
    apiContent: document.getElementById("apiContent"),
    notificationToast: document.getElementById("notificationToast"),
    notificationBell: document.getElementById("notificationBell"),
    notificationBadge: document.getElementById("notificationBadge"),
    modal: {
      instance: null,
      element: document.getElementById("apiResponseModal"),
      label: document.getElementById("apiResponseModalLabel"),
      desc: document.getElementById("apiResponseModalDesc"),
      content: document.getElementById("apiResponseContent"),
      container: document.getElementById("responseContainer"),
      endpoint: document.getElementById("apiEndpoint"),
      spinner: document.getElementById("apiResponseLoading"),
      queryInputContainer: document.getElementById("apiQueryInputContainer"),
      submitBtn: document.getElementById("submitQueryBtn"),
      copyEndpointBtn: document.getElementById("copyEndpoint"),
      copyResponseBtn: document.getElementById("copyResponse"),
    },
    // Page content elements
    pageTitle: document.getElementById("page"),
    wm: document.getElementById("wm"),
    appName: document.getElementById("name"),
    sideNavName: document.getElementById("sideNavName"),
    versionBadge: document.getElementById("version"),
    versionHeaderBadge: document.getElementById("versionHeader"),
    appDescription: document.getElementById("description"),
    dynamicImage: document.getElementById("dynamicImage"),
  }

  let settings = {}
  let currentApiData = null
  let allNotifications = []

  // --- URL Parameter Functions ---
  const getUrlParameter = (name) => {
    const urlParams = new URLSearchParams(window.location.search)
    return urlParams.get(name)
  }

  const updateUrlParameter = (key, value) => {
    const url = new URL(window.location)
    if (value) {
      url.searchParams.set(key, value)
    } else {
      url.searchParams.delete(key)
    }
    window.history.replaceState({}, "", url)
  }

  const removeUrlParameter = (key) => {
    const url = new URL(window.location)
    url.searchParams.delete(key)
    window.history.replaceState({}, "", url)
  }

  // --- Share API Functions ---
  const generateShareLink = (apiData) => {
    const url = new URL(window.location.origin + window.location.pathname)
    // Remove parameters from the path before sharing
    const cleanPath = apiData.path.split("?")[0]
    url.searchParams.set("share", cleanPath)
    return url.toString()
  }

  const parseSharedApiFromUrl = () => {
    const sharedPath = getUrlParameter("share")
    return sharedPath || null
  }

  const findApiByPath = (path) => {
    if (!settings || !settings.categories) return null

    for (const category of settings.categories) {
      for (const item of category.items) {
        // Compare both full path and clean path (without parameters)
        const itemCleanPath = item.path.split("?")[0]
        if (item.path === path || itemCleanPath === path) {
          return {
            path: item.path,
            name: item.name,
            desc: item.desc,
            params: item.params || null,
            innerDesc: item.innerDesc || null,
          }
        }
      }
    }
    return null
  }

  const handleShareApi = async () => {
    if (!currentApiData) return

    const shareLink = generateShareLink(currentApiData)

    try {
      await navigator.clipboard.writeText(shareLink)
      showToast("Share link copied to clipboard!", "success", "Share API")

      // Update URL to reflect the shared API
      // Update URL to reflect the shared API (clean path without parameters)
      const cleanPath = currentApiData.path.split("?")[0]
      updateUrlParameter("share", cleanPath)
    } catch (err) {
      // Fallback for browsers that don't support clipboard API
      const textArea = document.createElement("textarea")
      textArea.value = shareLink
      document.body.appendChild(textArea)
      textArea.select()
      try {
        document.execCommand("copy")
        showToast("Share link copied to clipboard!", "success", "Share API")
        // Update URL to reflect the shared API (clean path without parameters)
        const cleanPath = currentApiData.path.split("?")[0]
        updateUrlParameter("share", cleanPath)
      } catch (fallbackErr) {
        showToast("Failed to copy share link", "error")
      }
      document.body.removeChild(textArea)
    }
  }

  const openSharedApi = async (sharedPath) => {
    // Wait for settings to be loaded
    if (!settings || !settings.categories) {
      setTimeout(() => openSharedApi(sharedPath), 100)
      return
    }

    // Find the API in settings using the path
    const apiData = findApiByPath(sharedPath)

    if (!apiData) {
      showToast("The shared API is no longer available", "error", "Share Link")
      // Clean up URL parameter
      removeUrlParameter("share")
      return
    }

    // Set current API data and open modal
    currentApiData = apiData
    setupModalForApi(currentApiData)

    // Show modal after a short delay to ensure DOM is ready
    setTimeout(() => {
      DOM.modal.instance.show()
      showToast(`Opened shared API: ${apiData.name}`, "info", "Share Link")
    }, 500)
  }

  // Utility Functions
  const showToast = (message, type = "info", title = "Notification") => {
    if (!DOM.notificationToast) return

    const toastBody = DOM.notificationToast.querySelector(".toast-body")
    const toastTitleEl = DOM.notificationToast.querySelector(".toast-title")
    const toastIcon = DOM.notificationToast.querySelector(".toast-icon")

    toastBody.textContent = message
    toastTitleEl.textContent = title

    const typeConfig = {
      success: { color: "var(--success-color)", icon: "fa-check-circle" },
      error: { color: "var(--error-color)", icon: "fa-exclamation-circle" },
      info: { color: "var(--info-color)", icon: "fa-info-circle" },
      warning: { color: "var(--warning-color)", icon: "fa-exclamation-triangle" },
    }

    const config = typeConfig[type] || typeConfig.info
    DOM.notificationToast.style.borderLeftColor = config.color
    toastIcon.className = `toast-icon fas ${config.icon} me-2`
    toastIcon.style.color = config.color

    const bsToast = new window.bootstrap.Toast(DOM.notificationToast)
    bsToast.show()
  }

  const copyToClipboard = async (text, btnElement) => {
    try {
      await navigator.clipboard.writeText(text)
      const originalIcon = btnElement.innerHTML
      btnElement.innerHTML = '<i class="fas fa-check"></i>'
      btnElement.classList.add("copy-success")
      showToast("Successfully copied to clipboard!", "success")

      setTimeout(() => {
        btnElement.innerHTML = originalIcon
        btnElement.classList.remove("copy-success")
      }, 2000)
    } catch (err) {
      showToast("Failed to copy text", "error")
    }
  }

  const debounce = (func, delay) => {
    let timeout
    return (...args) => {
      clearTimeout(timeout)
      timeout = setTimeout(() => func.apply(this, args), delay)
    }
  }

  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // --- Notification Functions ---
  const loadNotifications = async () => {
    try {
      const response = await fetch("/api/notifications")
      if (!response.ok) throw new Error(`Failed to load notifications: ${response.status}`)
      allNotifications = await response.json()
      updateNotificationBadge()
    } catch (error) {
      console.error("Error loading notifications:", error)
    }
  }

  const getSessionReadNotificationIds = () => {
    const ids = sessionStorage.getItem("sessionReadNotificationIds")
    return ids ? JSON.parse(ids) : []
  }

  const addSessionReadNotificationId = (id) => {
    const ids = getSessionReadNotificationIds()
    if (!ids.includes(id)) {
      ids.push(id)
      sessionStorage.setItem("sessionReadNotificationIds", JSON.stringify(ids))
    }
  }

  const updateNotificationBadge = () => {
    if (!DOM.notificationBadge || !allNotifications.length) {
      if (DOM.notificationBadge) DOM.notificationBadge.classList.remove("active")
      return
    }

    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const sessionReadIds = getSessionReadNotificationIds()

    const unreadNotifications = allNotifications.filter((notif) => {
      const notificationDate = new Date(notif.date)
      notificationDate.setHours(0, 0, 0, 0)
      return !notif.read && notificationDate <= today && !sessionReadIds.includes(notif.id)
    })

    if (unreadNotifications.length > 0) {
      DOM.notificationBadge.classList.add("active")
      DOM.notificationBell.setAttribute("aria-label", `Notifications (${unreadNotifications.length} unread)`)
    } else {
      DOM.notificationBadge.classList.remove("active")
      DOM.notificationBell.setAttribute("aria-label", "No new notifications")
    }
  }

  const handleNotificationBellClick = () => {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const sessionReadIds = getSessionReadNotificationIds()

    const notificationsToShow = allNotifications.filter((notif) => {
      const notificationDate = new Date(notif.date)
      notificationDate.setHours(0, 0, 0, 0)
      return !notif.read && notificationDate <= today && !sessionReadIds.includes(notif.id)
    })

    if (notificationsToShow.length > 0) {
      notificationsToShow.forEach((notif) => {
        showToast(notif.message, "info", `Notification (${new Date(notif.date).toLocaleDateString("en-US")})`)
        addSessionReadNotificationId(notif.id)
      })
    } else {
      showToast("No new notifications at this time.", "info")
    }

    updateNotificationBadge()
  }

  // Theme Management
  const initTheme = () => {
    const savedTheme = localStorage.getItem("darkMode")
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches

    if (savedTheme === "true" || (savedTheme === null && prefersDark)) {
      DOM.body.classList.add("dark-mode")
      if (DOM.themeToggle) DOM.themeToggle.checked = true
    }
  }

  const handleThemeToggle = () => {
    DOM.body.classList.toggle("dark-mode")
    const isDarkMode = DOM.body.classList.contains("dark-mode")
    localStorage.setItem("darkMode", isDarkMode)
    showToast(`Switched to ${isDarkMode ? "dark" : "light"} mode`, "success")
  }

  // --- Side Navigation Management ---
  const initSideNav = () => {
    if (DOM.sideNav) {
      const isCollapsed = DOM.sideNav.classList.contains("collapsed")
    }
  }

  // Navigation Management
  const toggleSideNavMobile = () => {
    if (!DOM.sideNav || !DOM.menuToggle) return
    DOM.sideNav.classList.toggle("active")
    const isActive = DOM.sideNav.classList.contains("active")
    DOM.menuToggle.setAttribute("aria-expanded", isActive)
  }

  const closeSideNavOnClickOutside = (e) => {
    if (!DOM.sideNav || !DOM.menuToggle) return
    if (
      window.innerWidth < 1024 &&
      !DOM.sideNav.contains(e.target) &&
      !DOM.menuToggle.contains(e.target) &&
      DOM.sideNav.classList.contains("active")
    ) {
      DOM.sideNav.classList.remove("active")
      DOM.menuToggle.setAttribute("aria-expanded", "false")
    }
  }

  const handleScroll = () => {
    const scrollPosition = window.scrollY
    const headerElement = document.querySelector(".main-header")
    const headerHeight = headerElement ? Number.parseInt(getComputedStyle(headerElement).height) : 70

    document.querySelectorAll("section[id]").forEach((section) => {
      const sectionTop = section.offsetTop - headerHeight - 20
      const sectionHeight = section.offsetHeight
      const sectionId = section.getAttribute("id")

      const navLink = document.querySelector(`.side-nav-link[href="#${sectionId}"]`)
      if (navLink) {
        if (scrollPosition >= sectionTop && scrollPosition < sectionTop + sectionHeight) {
          document.querySelectorAll(".side-nav-link.active").forEach((l) => {
            l.classList.remove("active")
            l.removeAttribute("aria-current")
          })
          navLink.classList.add("active")
          navLink.setAttribute("aria-current", "page")
        }
      }
    })
  }

  // --- Modal Initialization ---
  const initModal = () => {
    if (DOM.modal.element) {
      DOM.modal.instance = new window.bootstrap.Modal(DOM.modal.element)
    }
  }

  // --- Page Content Population ---
  const setPageContent = (element, value, fallback = "") => {
    if (element) element.textContent = value || fallback
  }

  const setPageAttribute = (element, attribute, value, fallback = "") => {
    if (element) element.setAttribute(attribute, value || fallback)
  }

  // Loading Screen Management
  const hideLoadingScreen = () => {
    if (!DOM.loadingScreen) return

    DOM.loadingScreen.classList.add("fade-out")
    setTimeout(() => {
      DOM.loadingScreen.style.display = "none"
      DOM.body.classList.remove("no-scroll")
    }, 300)
  }

  const animateLoadingDots = () => {
    const loadingDots = DOM.loadingScreen.querySelector(".loading-dots")
    if (loadingDots) {
      loadingDots.intervalId = setInterval(() => {
        if (loadingDots.textContent.length >= 3) {
          loadingDots.textContent = "."
        } else {
          loadingDots.textContent += "."
        }
      }, 500)
    }
  }
  animateLoadingDots()

  // Page Content Population
  const populatePageContent = () => {
    if (!settings || Object.keys(settings).length === 0) return

    const currentYear = new Date().getFullYear()

    if (DOM.pageTitle) DOM.pageTitle.textContent = settings.name || "Raol API"
    if (DOM.wm) DOM.wm.textContent = `© ${currentYear} ${settings.name || "Raol API"}. All rights reserved.`
    if (DOM.appName) DOM.appName.textContent = settings.name || "Raol API"
    if (DOM.sideNavName) DOM.sideNavName.textContent = settings.name || "API Docs"
    if (DOM.versionBadge) DOM.versionBadge.textContent = settings.version || "v2.0"
    if (DOM.versionHeaderBadge) DOM.versionHeaderBadge.textContent = settings.header?.status || "Online"
    if (DOM.appDescription) DOM.appDescription.textContent = settings.description || "Modern REST API documentation"

    // Set banner image
    if (DOM.dynamicImage) {
      const imageSrc = settings.bannerImage || "/src/banner.jpg"
      DOM.dynamicImage.src = imageSrc
      DOM.dynamicImage.alt = `${settings.name || "API"} Banner`

      DOM.dynamicImage.onerror = () => {
        DOM.dynamicImage.src = "/src/banner.jpg"
        DOM.dynamicImage.alt = "API Banner"
      }
    }
  }

  // HTTP Method Badge Helper
  const getMethodBadge = (method = "GET") => {
    const methodClass = `method-${method.toLowerCase()}`
    return `<span class="method-badge ${methodClass}">${method}</span>`
  }

  // API Categories Rendering
  const renderApiCategories = () => {
    if (!DOM.apiContent || !settings.categories || !settings.categories.length) {
      DOM.apiContent.innerHTML = `
        <div class="text-center p-5">
          <i class="fas fa-exclamation-triangle fa-3x text-muted mb-3"></i>
          <h5>No API categories found</h5>
          <p class="text-muted">Please check your configuration.</p>
        </div>
      `
      return
    }

    DOM.apiContent.innerHTML = ""

    settings.categories.forEach((category, categoryIndex) => {
      const categorySection = document.createElement("section")
      categorySection.className = "category-section"
      categorySection.id = `category-${category.name.toLowerCase().replace(/\s+/g, "-")}`
      categorySection.setAttribute("aria-labelledby", `category-title-${categoryIndex}`)

      const categoryHeader = document.createElement("h3")
      categoryHeader.id = `category-title-${categoryIndex}`
      categoryHeader.className = "category-header"

      if (category.icon) {
        const iconEl = document.createElement("i")
        iconEl.className = `${category.icon} me-2`
        iconEl.setAttribute("aria-hidden", "true")
        categoryHeader.appendChild(iconEl)
      }
      categoryHeader.appendChild(document.createTextNode(category.name))
      categorySection.appendChild(categoryHeader)

      const itemsGrid = document.createElement("div")
      itemsGrid.className = "row"

      category.items.forEach((item, itemIndex) => {
        const itemCol = document.createElement("div")
        itemCol.className = "api-item"
        itemCol.dataset.name = item.name
        itemCol.dataset.desc = item.desc
        itemCol.dataset.category = category.name

        const apiCard = document.createElement("article")
        apiCard.className = "api-card h-100"
        apiCard.setAttribute("aria-labelledby", `api-title-${categoryIndex}-${itemIndex}`)

        // Add unavailable class if needed
        if (item.status === "error" || item.status === "update") {
          apiCard.classList.add("api-card-unavailable")
        }

        const cardInfo = document.createElement("div")
        cardInfo.className = "api-card-info"

        const itemTitle = document.createElement("h5")
        itemTitle.id = `api-title-${categoryIndex}-${itemIndex}`
        itemTitle.className = "mb-2"

        // Add method badge
        const method = item.method || "GET"
        itemTitle.innerHTML = `${getMethodBadge(method)} ${item.name}`

        const itemDesc = document.createElement("p")
        itemDesc.className = "text-muted mb-0"
        itemDesc.textContent = item.desc

        cardInfo.appendChild(itemTitle)
        cardInfo.appendChild(itemDesc)

        const actionsDiv = document.createElement("div")
        actionsDiv.className = "api-actions mt-auto"

        const tryBtn = document.createElement("button")
        tryBtn.type = "button"
        tryBtn.className = "btn get-api-btn btn-sm"
        tryBtn.innerHTML = '<i class="fas fa-play me-1" aria-hidden="true"></i> Try it out'
        tryBtn.dataset.apiPath = item.path
        tryBtn.dataset.apiName = item.name
        tryBtn.dataset.apiDesc = item.desc
        tryBtn.dataset.apiMethod = method
        if (item.params) tryBtn.dataset.apiParams = JSON.stringify(item.params)
        if (item.innerDesc) tryBtn.dataset.apiInnerDesc = item.innerDesc
        tryBtn.setAttribute("aria-label", `Try ${item.name} endpoint`)

        const status = item.status || "ready"
        const statusConfig = {
          ready: { class: "status-ready", icon: "fa-check-circle", text: "Ready" },
          error: { class: "status-error", icon: "fa-exclamation-triangle", text: "Error" },
          update: { class: "status-update", icon: "fa-sync-alt", text: "Updating" },
        }
        const currentStatus = statusConfig[status] || statusConfig.ready

        if (status === "error" || status === "update") {
          tryBtn.disabled = true
          tryBtn.title = `This endpoint is currently ${status === "error" ? "unavailable" : "being updated"}`
        }

        const statusIndicator = document.createElement("div")
        statusIndicator.className = `api-status ${currentStatus.class}`
        statusIndicator.title = `Status: ${currentStatus.text}`
        statusIndicator.innerHTML = `<i class="fas ${currentStatus.icon} me-1" aria-hidden="true"></i><span>${currentStatus.text}</span>`

        actionsDiv.appendChild(tryBtn)
        actionsDiv.appendChild(statusIndicator)

        apiCard.appendChild(cardInfo)
        apiCard.appendChild(actionsDiv)
        itemCol.appendChild(apiCard)
        itemsGrid.appendChild(itemCol)
      })

      categorySection.appendChild(itemsGrid)
      DOM.apiContent.appendChild(categorySection)
    })

    // Initialize intersection observer for animations
    observeApiItems()
  }

  // --- Render API Categories and Items ---
  const displayErrorState = (message) => {
    if (!DOM.apiContent) return
    DOM.apiContent.innerHTML = `
            <div class="no-results-message text-center p-5">
                <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
                <p class="h5">${message}</p>
                <p class="text-muted">Please try reloading the page or contact the administrator.</p>
                <button class="btn btn-primary mt-3" onclick="location.reload()">
                    <i class="fas fa-sync-alt me-2"></i> Reload
                </button>
            </div>
        `
  }

  // Search Functionality
  const handleSearch = () => {
    if (!DOM.searchInput || !DOM.apiContent) return

    const searchTerm = DOM.searchInput.value.toLowerCase().trim()
    DOM.clearSearchBtn.classList.toggle("visible", searchTerm.length > 0)

    const apiItems = DOM.apiContent.querySelectorAll(".api-item")
    const visibleCategories = new Set()

    apiItems.forEach((item) => {
      const name = (item.dataset.name || "").toLowerCase()
      const desc = (item.dataset.desc || "").toLowerCase()
      const category = (item.dataset.category || "").toLowerCase()
      const matches = name.includes(searchTerm) || desc.includes(searchTerm) || category.includes(searchTerm)

      item.style.display = matches ? "" : "none"
      if (matches) {
        visibleCategories.add(item.closest(".category-section"))
      }
    })

    DOM.apiContent.querySelectorAll(".category-section").forEach((section) => {
      section.style.display = visibleCategories.has(section) ? "" : "none"
    })

    // Show no results message if needed
    const hasResults = visibleCategories.size > 0
    let noResultsMsg = DOM.apiContent.querySelector("#noResultsMessage")

    if (!hasResults && searchTerm.length > 0) {
      if (!noResultsMsg) {
        noResultsMsg = document.createElement("div")
        noResultsMsg.id = "noResultsMessage"
        noResultsMsg.className = "text-center p-5"
        noResultsMsg.innerHTML = `
          <i class="fas fa-search fa-3x text-muted mb-3"></i>
          <h5>No results found</h5>
          <p class="text-muted">No endpoints match your search for "<span id="searchTerm"></span>"</p>
          <button class="btn btn-primary mt-3" onclick="document.getElementById('searchInput').value = ''; document.getElementById('searchInput').dispatchEvent(new Event('input'))">
            <i class="fas fa-times me-2"></i> Clear Search
          </button>
        `
        DOM.apiContent.appendChild(noResultsMsg)
      }
      noResultsMsg.querySelector("#searchTerm").textContent = searchTerm
      noResultsMsg.style.display = "block"
    } else if (noResultsMsg) {
      noResultsMsg.style.display = "none"
    }
  }

  const clearSearch = () => {
    if (!DOM.searchInput) return
    DOM.searchInput.value = ""
    DOM.searchInput.focus()
    handleSearch()
  }

  // --- Search Functionality ---
  const createNoResultsMessage = () => {
    let noResultsMsg = document.getElementById("noResultsMessage")
    if (!noResultsMsg) {
      noResultsMsg = document.createElement("div")
      noResultsMsg.id = "noResultsMessage"
      noResultsMsg.className =
        "no-results-message flex-column align-items-center justify-content-center p-5 text-center"
      noResultsMsg.style.display = "none"
      noResultsMsg.innerHTML = `
                <i class="fas fa-search fa-3x text-muted mb-3"></i>
                <p class="h5">No results for <span></span></p>
                <button id="clearSearchFromMsg" class="btn btn-primary mt-3">
                    <i class="fas fa-times me-2"></i> Clear Search
                </button>
            `
      DOM.apiContent.appendChild(noResultsMsg)
      document.getElementById("clearSearchFromMsg").addEventListener("click", clearSearch)
    }
    return noResultsMsg
  }

  // API Button Click Handling
  const handleApiGetButtonClick = (event) => {
    const getApiBtn = event.target.closest(".get-api-btn")
    if (!getApiBtn || getApiBtn.disabled) return

    currentApiData = {
      path: getApiBtn.dataset.apiPath,
      name: getApiBtn.dataset.apiName,
      desc: getApiBtn.dataset.apiDesc,
      method: getApiBtn.dataset.apiMethod || "GET",
      params: getApiBtn.dataset.apiParams ? JSON.parse(getApiBtn.dataset.apiParams) : null,
      innerDesc: getApiBtn.dataset.apiInnerDesc,
    }

    setupModalForApi(currentApiData)
    DOM.modal.instance.show()
  }

  const setupModalForApi = (apiData) => {
    DOM.modal.label.textContent = apiData.name
    DOM.modal.desc.textContent = apiData.desc
    DOM.modal.content.innerHTML = ""

    // Show method badge and endpoint
    const methodBadge = getMethodBadge(apiData.method)
    const endpointUrl = `${window.location.origin}${apiData.path.split("?")[0]}`
    DOM.modal.endpoint.innerHTML = `${methodBadge} ${endpointUrl}`

    // Reset modal state
    DOM.modal.spinner.classList.add("d-none")
    DOM.modal.content.classList.add("d-none")
    DOM.modal.container.classList.add("d-none")
    DOM.modal.queryInputContainer.innerHTML = ""
    DOM.modal.submitBtn.classList.add("d-none")
    DOM.modal.submitBtn.disabled = true

    // Hide all footer buttons initially
    const editParamsBtn = DOM.modal.element.querySelector(".edit-params-btn")
    const downloadImageBtn = DOM.modal.element.querySelector(".download-image-btn")
    const shareApiBtn = DOM.modal.element.querySelector(".share-api-btn")
    if (editParamsBtn) editParamsBtn.style.display = "none"
    if (downloadImageBtn) downloadImageBtn.style.display = "none"
    if (shareApiBtn) shareApiBtn.style.display = "none"

    // Create share button if it doesn't exist
    if (!shareApiBtn) {
      const newShareBtn = document.createElement("button")
      newShareBtn.className = "btn btn-info me-2 share-api-btn"
      newShareBtn.innerHTML = '<i class="fas fa-share-alt me-2"></i> Share API'
      newShareBtn.onclick = handleShareApi

      // Insert the share button in the modal footer
      const modalFooter = DOM.modal.element.querySelector(".modal-footer")
      modalFooter.insertBefore(newShareBtn, DOM.modal.submitBtn)
    }

    // Always show share button when modal opens
    const shareBtn = DOM.modal.element.querySelector(".share-api-btn")
    if (shareBtn) shareBtn.style.display = "inline-block"

    // Check if endpoint has parameters
    const paramsFromPath = new URLSearchParams(apiData.path.split("?")[1])
    const paramKeys = Array.from(paramsFromPath.keys())

    if (paramKeys.length > 0) {
      createParameterForm(paramKeys, apiData.params)
      DOM.modal.submitBtn.classList.remove("d-none")
    } else {
      // No parameters, make request immediately
      handleApiRequest(`${window.location.origin}${apiData.path}`, apiData.name)
    }
  }

  const createParameterForm = (paramKeys, paramDescriptions) => {
    const paramContainer = document.createElement("div")
    paramContainer.className = "param-container"

    const formTitle = document.createElement("h6")
    formTitle.className = "param-form-title"
    formTitle.innerHTML = '<i class="fas fa-sliders-h me-2" aria-hidden="true"></i> Parameters'
    paramContainer.appendChild(formTitle)

    paramKeys.forEach((paramKey) => {
      const paramGroup = document.createElement("div")
      paramGroup.className = "param-group mb-3"

      const labelContainer = document.createElement("div")
      labelContainer.className = "param-label-container"

      const label = document.createElement("label")
      label.className = "form-label"
      label.textContent = paramKey
      label.htmlFor = `param-${paramKey}`

      const requiredSpan = document.createElement("span")
      requiredSpan.className = "required-indicator ms-1"
      requiredSpan.textContent = "*"
      label.appendChild(requiredSpan)
      labelContainer.appendChild(label)

      if (paramDescriptions && paramDescriptions[paramKey]) {
        const tooltipIcon = document.createElement("i")
        tooltipIcon.className = "fas fa-info-circle param-info ms-1"
        tooltipIcon.title = paramDescriptions[paramKey]
        labelContainer.appendChild(tooltipIcon)
      }

      paramGroup.appendChild(labelContainer)

      const inputField = document.createElement("input")
      inputField.type = "text"
      inputField.className = "form-control custom-input"
      inputField.id = `param-${paramKey}`
      inputField.placeholder = `Enter ${paramKey}...`
      inputField.dataset.param = paramKey
      inputField.required = true
      inputField.addEventListener("input", validateModalInputs)

      paramGroup.appendChild(inputField)
      paramContainer.appendChild(paramGroup)
    })

    DOM.modal.queryInputContainer.appendChild(paramContainer)
    validateModalInputs()
  }

  const validateModalInputs = () => {
    const inputs = DOM.modal.queryInputContainer.querySelectorAll("input[required]")
    const allFilled = Array.from(inputs).every((input) => input.value.trim() !== "")
    DOM.modal.submitBtn.disabled = !allFilled

    inputs.forEach((input) => {
      if (input.value.trim()) {
        input.classList.remove("is-invalid")
      }
    })
  }

  const handleSubmitQuery = async () => {
    if (!currentApiData) return

    const inputs = DOM.modal.queryInputContainer.querySelectorAll("input")
    const newParams = new URLSearchParams()
    let isValid = true

    inputs.forEach((input) => {
      if (input.required && !input.value.trim()) {
        isValid = false
        input.classList.add("is-invalid")
      } else {
        input.classList.remove("is-invalid")
        if (input.value.trim()) {
          newParams.append(input.dataset.param, input.value.trim())
        }
      }
    })

    if (!isValid) {
      showToast("Please fill in all required fields", "error")
      return
    }

    DOM.modal.submitBtn.disabled = true
    DOM.modal.submitBtn.innerHTML = `
      <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
      Processing...
    `

    const apiUrlWithParams = `${window.location.origin}${currentApiData.path.split("?")[0]}?${newParams.toString()}`
    DOM.modal.endpoint.innerHTML = `${getMethodBadge(currentApiData.method)} ${apiUrlWithParams}`

    await handleApiRequest(apiUrlWithParams, currentApiData.name)
  }

  const handleApiRequest = async (apiUrl, apiName) => {
    DOM.modal.spinner.classList.remove("d-none")
    DOM.modal.container.classList.add("d-none")
    DOM.modal.content.innerHTML = ""

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 30000)

      const response = await fetch(apiUrl, {
        signal: controller.signal,
        method: currentApiData?.method || "GET",
      })
      clearTimeout(timeoutId)

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const contentType = response.headers.get("Content-Type")

      if (contentType && contentType.includes("image/")) {
        const blob = await response.blob()
        const imageUrl = URL.createObjectURL(blob)
        const img = document.createElement("img")
        img.src = imageUrl
        img.alt = apiName
        img.className = "img-fluid rounded shadow-sm"
        img.style.maxWidth = "100%"
        img.style.height = "auto"
        DOM.modal.content.appendChild(img)
      } else if (contentType && contentType.includes("application/json")) {
        const data = await response.json()
        const formattedJson = syntaxHighlightJson(JSON.stringify(data, null, 2))
        DOM.modal.content.innerHTML = formattedJson
      } else {
        const textData = await response.text()
        DOM.modal.content.textContent = textData || "No content returned"
      }

      DOM.modal.container.classList.remove("d-none")
      DOM.modal.content.classList.remove("d-none")
      showToast(`Successfully retrieved data from ${apiName}`, "success")
    } catch (error) {
      console.error("API Request Error:", error)
      const errorHtml = `
        <div class="alert alert-danger" role="alert">
          <h6 class="alert-heading">
            <i class="fas fa-exclamation-triangle me-2"></i>
            Request Failed
          </h6>
          <p class="mb-0">${error.message || "Failed to fetch data from the API endpoint"}</p>
        </div>
      `
      DOM.modal.content.innerHTML = errorHtml
      DOM.modal.container.classList.remove("d-none")
      DOM.modal.content.classList.remove("d-none")
      showToast("Request failed. Check the response for details.", "error")
    } finally {
      DOM.modal.spinner.classList.add("d-none")

      // Reset submit button
      if (DOM.modal.submitBtn) {
        DOM.modal.submitBtn.disabled = false
        DOM.modal.submitBtn.innerHTML = `
          <span>Send Request</span>
          <i class="fas fa-paper-plane ms-2" aria-hidden="true"></i>
        `
      }
    }
  }

  // JSON Syntax Highlighting
  const syntaxHighlightJson = (json) => {
    json = json.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    return json.replace(
      /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+-]?\d+)?)/g,
      (match) => {
        let cls = "json-number"
        if (/^"/.test(match)) {
          cls = /:$/.test(match) ? "json-key" : "json-string"
        } else if (/true|false/.test(match)) {
          cls = "json-boolean"
        } else if (/null/.test(match)) {
          cls = "json-null"
        }
        return `<span class="${cls}">${match}</span>`
      },
    )
  }

  // Intersection Observer for Animations
  const observeApiItems = () => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("in-view")
            observer.unobserve(entry.target)
          }
        })
      },
      { threshold: 0.1 },
    )

    document.querySelectorAll(".api-item").forEach((item) => {
      observer.observe(item)
    })
  }

  // --- Observe API Items for Animation ---
  const initializeTooltips = (parentElement = document) => {
    const tooltipTriggerList = [].slice.call(parentElement.querySelectorAll('[data-bs-toggle="tooltip"]'))
    tooltipTriggerList.map((tooltipTriggerEl) => {
      const existingTooltip = window.bootstrap.Tooltip.getInstance(tooltipTriggerEl)
      if (existingTooltip) {
        existingTooltip.dispose()
      }
      return new window.bootstrap.Tooltip(tooltipTriggerEl)
    })
  }

  // Event Listeners Setup
  const setupEventListeners = () => {
    if (DOM.menuToggle) DOM.menuToggle.addEventListener("click", toggleSideNavMobile)
    if (DOM.themeToggle) DOM.themeToggle.addEventListener("change", handleThemeToggle)
    if (DOM.searchInput) DOM.searchInput.addEventListener("input", debounce(handleSearch, 300))
    if (DOM.clearSearchBtn) DOM.clearSearchBtn.addEventListener("click", clearSearch)
    if (DOM.notificationBell) DOM.notificationBell.addEventListener("click", handleNotificationBellClick)
    if (DOM.apiContent) DOM.apiContent.addEventListener("click", handleApiGetButtonClick)
    if (DOM.modal.copyEndpointBtn) {
      DOM.modal.copyEndpointBtn.addEventListener("click", () =>
        copyToClipboard(
          DOM.modal.endpoint.textContent.replace(/^(GET|POST|PUT|DELETE|PATCH)\s+/, ""),
          DOM.modal.copyEndpointBtn,
        ),
      )
    }
    if (DOM.modal.copyResponseBtn) {
      DOM.modal.copyResponseBtn.addEventListener("click", () =>
        copyToClipboard(DOM.modal.content.textContent, DOM.modal.copyResponseBtn),
      )
    }
    if (DOM.modal.submitBtn) DOM.modal.submitBtn.addEventListener("click", handleSubmitQuery)

    document.addEventListener("click", closeSideNavOnClickOutside)
  }

  // Main Initialization
  const init = async () => {
    setupEventListeners()
    initTheme()
    initModal()
    await loadNotifications()

    try {
      const response = await fetch("/api/settings")
      if (!response.ok) throw new Error(`Failed to load settings: ${response.status}`)

      settings = await response.json()
      populatePageContent()
      renderApiCategories()

      showToast("API documentation loaded successfully", "success")
    } catch (error) {
      console.error("Error loading settings:", error)
      showToast("Failed to load API configuration", "error")

      // Show error state
      if (DOM.apiContent) {
        DOM.apiContent.innerHTML = `
          <div class="text-center p-5">
            <i class="fas fa-exclamation-triangle fa-3x text-danger mb-3"></i>
            <h5>Failed to Load API Configuration</h5>
            <p class="text-muted">${error.message}</p>
            <button class="btn btn-primary mt-3" onclick="location.reload()">
              <i class="fas fa-sync-alt me-2"></i> Retry
            </button>
          </div>
        `
      }
    } finally {
      hideLoadingScreen()
    }
  }

  // Run main initialization
  init()
})
