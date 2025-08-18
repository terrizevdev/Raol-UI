import os from "os"
import { performance } from "perf_hooks"

export default (app) => {
  const startTime = Date.now()

  // Helper function to format bytes
  const formatBytes = (bytes) => {
    if (bytes === 0) return "0 Bytes"
    const k = 1024
    const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Number.parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i]
  }

  // Helper function to format uptime
  const formatUptime = (seconds) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = Math.floor(seconds % 60)

    if (days > 0) {
      return `${days}d ${hours}h ${minutes}m ${secs}s`
    } else if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`
    } else {
      return `${secs}s`
    }
  }

  // Get CPU usage
  const getCPUUsage = () => {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage()
      const startTime = performance.now()

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage)
        const endTime = performance.now()
        const timeDiff = endTime - startTime

        const userUsage = endUsage.user / 1000 // Convert to milliseconds
        const systemUsage = endUsage.system / 1000
        const totalUsage = userUsage + systemUsage

        const cpuPercent = (totalUsage / timeDiff) * 100
        resolve(Math.min(100, Math.max(0, cpuPercent)))
      }, 100)
    })
  }

  // System overview endpoint
  app.get("/api/system/overview", async (req, res) => {
    try {
      const memoryUsage = process.memoryUsage()
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      }

      const cpuUsage = await getCPUUsage()
      const uptime = process.uptime()
      const systemUptime = os.uptime()

      res.json({
        status: true,
        data: {
          system: {
            platform: os.platform(),
            architecture: os.arch(),
            hostname: os.hostname(),
            nodeVersion: process.version,
            uptime: formatUptime(uptime),
            systemUptime: formatUptime(systemUptime),
            uptimeSeconds: uptime,
            systemUptimeSeconds: systemUptime,
          },
          cpu: {
            usage: Math.round(cpuUsage * 100) / 100,
            cores: os.cpus().length,
            model: os.cpus()[0]?.model || "Unknown",
            speed: os.cpus()[0]?.speed || 0,
          },
          memory: {
            process: {
              rss: formatBytes(memoryUsage.rss),
              heapTotal: formatBytes(memoryUsage.heapTotal),
              heapUsed: formatBytes(memoryUsage.heapUsed),
              external: formatBytes(memoryUsage.external),
              arrayBuffers: formatBytes(memoryUsage.arrayBuffers || 0),
            },
            system: {
              total: formatBytes(systemMemory.total),
              free: formatBytes(systemMemory.free),
              used: formatBytes(systemMemory.used),
              usagePercent: Math.round((systemMemory.used / systemMemory.total) * 100),
            },
          },
          performance: {
            startTime: new Date(startTime).toISOString(),
            currentTime: new Date().toISOString(),
            responseTime: Date.now() - req.startTime || 0,
          },
        },
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get system information",
        message: error.message,
      })
    }
  })

  // CPU usage endpoint
  app.get("/api/system/cpu", async (req, res) => {
    try {
      const cpuUsage = await getCPUUsage()
      const cpus = os.cpus()

      res.json({
        status: true,
        data: {
          usage: Math.round(cpuUsage * 100) / 100,
          cores: cpus.length,
          model: cpus[0]?.model || "Unknown",
          speed: cpus[0]?.speed || 0,
          details: cpus.map((cpu, index) => ({
            core: index,
            model: cpu.model,
            speed: cpu.speed,
            times: cpu.times,
          })),
        },
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get CPU information",
        message: error.message,
      })
    }
  })

  // Memory usage endpoint
  app.get("/api/system/memory", (req, res) => {
    try {
      const memoryUsage = process.memoryUsage()
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      }

      res.json({
        status: true,
        data: {
          process: {
            rss: {
              bytes: memoryUsage.rss,
              formatted: formatBytes(memoryUsage.rss),
            },
            heapTotal: {
              bytes: memoryUsage.heapTotal,
              formatted: formatBytes(memoryUsage.heapTotal),
            },
            heapUsed: {
              bytes: memoryUsage.heapUsed,
              formatted: formatBytes(memoryUsage.heapUsed),
            },
            external: {
              bytes: memoryUsage.external,
              formatted: formatBytes(memoryUsage.external),
            },
            arrayBuffers: {
              bytes: memoryUsage.arrayBuffers || 0,
              formatted: formatBytes(memoryUsage.arrayBuffers || 0),
            },
          },
          system: {
            total: {
              bytes: systemMemory.total,
              formatted: formatBytes(systemMemory.total),
            },
            free: {
              bytes: systemMemory.free,
              formatted: formatBytes(systemMemory.free),
            },
            used: {
              bytes: systemMemory.used,
              formatted: formatBytes(systemMemory.used),
            },
            usagePercent: Math.round((systemMemory.used / systemMemory.total) * 100),
          },
        },
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get memory information",
        message: error.message,
      })
    }
  })

  // Uptime endpoint
  app.get("/api/system/uptime", (req, res) => {
    try {
      const processUptime = process.uptime()
      const systemUptime = os.uptime()

      res.json({
        status: true,
        data: {
          process: {
            seconds: processUptime,
            formatted: formatUptime(processUptime),
            startTime: new Date(Date.now() - processUptime * 1000).toISOString(),
          },
          system: {
            seconds: systemUptime,
            formatted: formatUptime(systemUptime),
            startTime: new Date(Date.now() - systemUptime * 1000).toISOString(),
          },
        },
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get uptime information",
        message: error.message,
      })
    }
  })

  // Platform information endpoint
  app.get("/api/system/platform", (req, res) => {
    try {
      res.json({
        status: true,
        data: {
          platform: os.platform(),
          architecture: os.arch(),
          hostname: os.hostname(),
          type: os.type(),
          release: os.release(),
          version: os.version(),
          nodeVersion: process.version,
          processId: process.pid,
          processTitle: process.title,
          execPath: process.execPath,
          argv: process.argv,
          env: {
            NODE_ENV: process.env.NODE_ENV || "development",
            PORT: process.env.PORT || "3000",
          },
        },
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get platform information",
        message: error.message,
      })
    }
  })

  // Health check endpoint
  app.get("/api/system/health", async (req, res) => {
    try {
      const cpuUsage = await getCPUUsage()
      const memoryUsage = process.memoryUsage()
      const systemMemory = {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem(),
      }

      const health = {
        status: "healthy",
        timestamp: new Date().toISOString(),
        uptime: formatUptime(process.uptime()),
        checks: {
          cpu: {
            status: cpuUsage < 80 ? "healthy" : "warning",
            usage: Math.round(cpuUsage * 100) / 100,
            threshold: 80,
          },
          memory: {
            status: systemMemory.used / systemMemory.total < 0.9 ? "healthy" : "warning",
            usage: Math.round((systemMemory.used / systemMemory.total) * 100),
            threshold: 90,
          },
          disk: {
            status: "healthy", // Simplified for now
            usage: 0,
            threshold: 90,
          },
        },
      }

      // Determine overall health status
      const hasWarnings = Object.values(health.checks).some((check) => check.status === "warning")
      if (hasWarnings) {
        health.status = "warning"
      }

      res.json({
        status: true,
        data: health,
      })
    } catch (error) {
      res.status(500).json({
        status: false,
        error: "Failed to get health information",
        message: error.message,
        data: {
          status: "unhealthy",
          timestamp: new Date().toISOString(),
          error: error.message,
        },
      })
    }
  })
        }
            
