const appState = {
    isActive: false,
    routingMethod: 'sequential',
    trafficInterval: 600,
    nextServerIdx: 0,
    trafficCounter: 0,
    sessionStart: Date.now(),
    servers: [
        { id: 1, label: 'Backend A', traffic: 0, handled: 0, latency: 0, active: true },
        { id: 2, label: 'Backend B', traffic: 0, handled: 0, latency: 0, active: true },
        { id: 3, label: 'Backend C', traffic: 0, handled: 0, latency: 0, active: true },
        { id: 4, label: 'Backend D', traffic: 0, handled: 0, latency: 0, active: true }
    ],
    trafficLog: [],
    metrics: {
        totalHandled: 0,
        reliability: 100,
        meanLatency: 0,
        throughput: 0
    }
};
let mainIntervalId = null;
let decayIntervalId = null;

function routeSequential() {
    const activeServers = appState.servers.filter(server => server.active);
    if (activeServers.length === 0) return null;
    
    const targetServer = activeServers[appState.nextServerIdx % activeServers.length];
    appState.nextServerIdx++;
    return targetServer;
}

function processIncomingTraffic() {
    const destinationServer = routeSequential();
    
    if (!destinationServer) return;

    const trafficId = appState.trafficCounter++;
    const processingTime = Math.floor(Math.random() * 180) + 60;
    
    const newTraffic = {
        id: trafficId,
        targetId: destinationServer.id,
        processingTime: processingTime,
        state: 'processing'
    };
    
    appState.trafficLog.unshift(newTraffic);
    if (appState.trafficLog.length > 20) {
        appState.trafficLog.pop();
    }
    
    const targetServer = appState.servers.find(s => s.id === destinationServer.id);
    targetServer.traffic = Math.min(100, targetServer.traffic + 18);
    targetServer.handled++;
    targetServer.latency = Math.floor(
        (targetServer.latency * (targetServer.handled - 1) + processingTime) / targetServer.handled
    );
    
    appState.metrics.totalHandled++;
    appState.metrics.meanLatency = Math.floor(
        (appState.metrics.meanLatency * (appState.metrics.totalHandled - 1) + processingTime) / 
        appState.metrics.totalHandled
    );
    
    const elapsedSeconds = (Date.now() - appState.sessionStart) / 1000;
    appState.metrics.throughput = Math.floor(appState.metrics.totalHandled / elapsedSeconds);
    
    setTimeout(() => {
        const trafficItem = appState.trafficLog.find(t => t.id === trafficId);
        if (trafficItem) {
            trafficItem.state = 'complete';
        }
        targetServer.traffic = Math.max(0, targetServer.traffic - 18);
        renderUI();
    }, processingTime);
    
    renderUI();
}

function startTrafficDecay() {
    decayIntervalId = setInterval(() => {
        appState.servers.forEach(server => {
            server.traffic = Math.max(0, server.traffic - 3);
        });
        renderServers();
    }, 250);
}

function renderMetrics() {
    const metricsData = [
        { 
            title: 'Processed', 
            value: appState.metrics.totalHandled, 
            icon: 'M13 10V3L4 14h7v7l9-11h-7z', 
            color: 'cyan' 
        },
        { 
            title: 'Uptime', 
            value: appState.metrics.reliability + '%', 
            icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z', 
            color: 'green' 
        },
        { 
            title: 'Mean Latency', 
            value: appState.metrics.meanLatency + 'ms', 
            icon: 'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', 
            color: 'yellow' 
        },
        { 
            title: 'Rate/Sec', 
            value: appState.metrics.throughput, 
            icon: 'M13 10V3L4 14h7v7l9-11h-7z', 
            color: 'purple' 
        }
    ];
    
    const metricsHTML = metricsData.map(metric => `
        <div class="metric-card">
            <div class="metric-content">
                <div>
                    <p class="metric-label">${metric.title}</p>
                    <p class="metric-value">${metric.value}</p>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('metrics').innerHTML = metricsHTML;
}

function getTrafficColorClass(traffic, isActive) {
    if (!isActive) return 'bg-gray';
    if (traffic < 25) return 'bg-green';
    if (traffic < 55) return 'bg-yellow';
    if (traffic < 75) return 'bg-orange';
    return 'bg-red';
}

function renderServers() {
    const serversHTML = appState.servers.map(server => `
        <div class="glass-card server-card">
            <div class="server-header">
            <div class="server-info">
            <h3 class="server-name">${server.label}</h3>
            </div>
                <button data-server-id="${server.id}" 
                    class="status-badge toggle-server ${server.active ? 'status-online' : 'status-offline'}">
                    ${server.active ? 'Online' : 'Offline'}
                </button>
            </div>
            <div class="server-content">
            <div class="load-section">
            <div class="load-header">
                <span class="load-label">Current Load</span>
                <span class="load-value">${Math.floor(server.traffic)}%</span>
                    </div>
                    <div class="load-bar">
                        <div class="load-fill ${getTrafficColorClass(server.traffic, server.active)}" 
                        style="width: ${server.traffic}%"></div>
                    </div>
                </div>
                <div class="server-stats">
                    <div class="stat-box">
                        <p class="stat-label">Handled</p>
                        <p class="stat-value">${server.handled}</p>
                    </div>
                    <div class="stat-box">
                        <p class="stat-label">Avg Time</p>
                        <p class="stat-value">${server.latency}ms</p>
                    </div>
                </div>
            </div>
        </div>
    `).join('');
    
    document.getElementById('servers').innerHTML = serversHTML;
}

function renderTrafficStream() {
    if (appState.trafficLog.length === 0) {
        document.getElementById('trafficStream').innerHTML = `
            <div class="traffic-empty">
            Press Start to begin traffic simulation
            </div>
        `;
        return;
    }
    
    const trafficHTML = appState.trafficLog.map(traffic => {
        const targetServer = appState.servers.find(s => s.id === traffic.targetId);
        const isProcessing = traffic.state === 'processing';
        
        return `
            <div class="traffic-item ${isProcessing ? 'traffic-processing' : 'traffic-complete'}">
                <div class="traffic-left">
                <div class="traffic-dot ${isProcessing ? 'dot-processing' : 'dot-complete'}"></div>
                <span class="traffic-id">Traffic #${traffic.id}</span>
                <span class="traffic-arrow">→</span>
                <span class="traffic-server">${targetServer ? targetServer.label : 'Unknown'}</span>
                </div>
                <div class="traffic-right">
                    <span class="traffic-time">${traffic.processingTime}ms</span>
                    <span class="traffic-status ${isProcessing ? 'status-processing' : 'status-complete'}">
                        ${isProcessing ? 'Processing' : 'Complete'}
                    </span>
                </div>
            </div>
        `;
    }).join('');
    
    document.getElementById('trafficStream').innerHTML = trafficHTML;
}

function renderUI() {
    renderMetrics();
    renderServers();
    renderTrafficStream();
}
function toggleServerStatus(serverId) {
    const server = appState.servers.find(s => s.id === serverId);
    if (server) {
        server.active = !server.active;
        renderUI();
    }
}
function attachServerToggleListeners() {
    document.getElementById('servers').addEventListener('click', function(e) {
        if (e.target.classList.contains('toggle-server')) {
            const serverId = parseInt(e.target.getAttribute('data-server-id'));
            toggleServerStatus(serverId);
        }
    });
}
function toggleSystem() {
    appState.isActive = !appState.isActive;
    const toggleButton = document.getElementById('toggleBtn');
    
    if (appState.isActive) {
        toggleButton.innerHTML = '<span>Stop</span>';
        toggleButton.className = 'btn btn-danger';
        mainIntervalId = setInterval(processIncomingTraffic, appState.trafficInterval);
    } else {
        toggleButton.innerHTML = '<span>Start</span>';
        toggleButton.className = 'btn btn-primary';
        clearInterval(mainIntervalId);
    }
}

function resetSystem() {
    appState.isActive = false;
    
    appState.servers.forEach(server => {
        server.traffic = 0;
        server.handled = 0;
        server.latency = 0;
        server.active = true;
    });
    appState.trafficLog = [];
    appState.metrics = {
        totalHandled: 0,
        reliability: 100,
        meanLatency: 0,
        throughput: 0
    };
    appState.nextServerIdx = 0;
    appState.trafficCounter = 0;
    appState.sessionStart = Date.now();
    
    clearInterval(mainIntervalId);
    const toggleButton = document.getElementById('toggleBtn');
    toggleButton.innerHTML = '<span>Start</span>';
    toggleButton.className = 'btn btn-primary';
    
    renderUI();
}
function updateTrafficRate(event) {
    appState.trafficInterval = parseInt(event.target.value);
    document.getElementById('rateDisplay').textContent = `${appState.trafficInterval}ms interval`;
    
    if (appState.isActive) {
        clearInterval(mainIntervalId);
        mainIntervalId = setInterval(processIncomingTraffic, appState.trafficInterval);
    }
}
function initializeApp() {
    document.getElementById('toggleBtn').addEventListener('click', toggleSystem);
    document.getElementById('resetBtn').addEventListener('click', resetSystem);
    document.getElementById('trafficRate').addEventListener('input', updateTrafficRate);
    attachServerToggleListeners();
    renderUI();
    startTrafficDecay();
}
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    initializeApp();
}
