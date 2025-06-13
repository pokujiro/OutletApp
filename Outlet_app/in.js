// グローバル変数
let currentUsage = 'day';
const pricePerKWh = 25;
let usageChart;
let currentTab = 1;
let currentEditingDevice = null;
let currentPeriodIndex = 0;
let outlets = [
    { id: 1, name: "リビングルーム", devices: [], isOn: true }
];
let monthlyGoals = [];
let plugData = [];
const dataInterval = 60000;  // 1分ごとにデータを取得

// スマートプラグとの通信を模倣するための関数
function getSmartPlugData() {
    // 実際にはここでスマートプラグからデータを取得します
    // この例では、ランダムな値を生成しています
    return {
        current: Math.random() * 5,  // 0-5 A
        voltage: 220 + Math.random() * 10,  // 220-230 V
        power: Math.random() * 1000,  // 0-1000 W
        timestamp: new Date().getTime()
    };
}

function fetchAndStoreData() {
    const newData = getSmartPlugData();
    plugData.push(newData);
    // 24時間分のデータのみを保持
    if (plugData.length > 1440) {
        plugData.shift();
    }
    updatePowerUsage(outlets.find(o => o.id === currentTab));
}

function initializeOutlets() {
    const tabsContainer = document.getElementById('outlet-tabs');
    tabsContainer.innerHTML = '';
    outlets.forEach((outlet, index) => {
        const button = document.createElement('button');
        button.className = 'tab-button' + (index === 0 ? ' active' : '');
        button.textContent = outlet.name;
        button.onclick = () => showTab(outlet.id);
        tabsContainer.appendChild(button);
    });
    showTab(outlets[0].id);
}

function addOutlet() {
    const newId = outlets.length > 0 ? Math.max(...outlets.map(o => o.id)) + 1 : 1;
    outlets.push({ id: newId, name: `コンセント${newId}`, devices: [], isOn: true });
    initializeOutlets();
    showTab(newId);
}

function showTab(outletId) {
    currentTab = outletId;
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.toggle('active', btn.textContent === outlets.find(o => o.id === outletId).name);
    });
    const outlet = outlets.find(o => o.id === outletId);
    document.getElementById('outlet-name').textContent = outlet.name;
    renderDevices(outlet);
    updatePowerUsage(outlet);
}

function showUsage(period) {
    currentUsage = period;
    currentPeriodIndex = 0;
    document.querySelectorAll('.usage-tab').forEach(tab => {
        tab.classList.toggle('active', tab.textContent.includes(period));
    });
    updatePowerUsage(outlets.find(o => o.id === currentTab));
}

function showPreviousPeriod() {
    currentPeriodIndex++;
    updatePowerUsage(outlets.find(o => o.id === currentTab));
}

function showNextPeriod() {
    if (currentPeriodIndex > 0) {
        currentPeriodIndex--;
        updatePowerUsage(outlets.find(o => o.id === currentTab));
    }
}

function calculateUsage(period) {
    let totalEnergy = 0;
    let dataPoints = 0;
    const now = new Date().getTime();
    const periodStart = now - period;
    
    for (let data of plugData) {
        if (data.timestamp >= periodStart) {
            totalEnergy += data.power / 60000;  // Wh
            dataPoints++;
        }
    }
    
    // データが不足している場合、平均値で補完
    if (dataPoints < period / dataInterval) {
        const averageEnergy = totalEnergy / dataPoints;
        totalEnergy = averageEnergy * (period / dataInterval);
    }
    
    return totalEnergy / 1000 * pricePerKWh;  // 円に変換
}

function updatePowerUsage(outlet) {
    let usage, labels, data;
    const totalPower = plugData.length > 0 ? plugData[plugData.length - 1].power : 0;

    switch (currentUsage) {
        case 'day':
            usage = calculateUsage(24 * 60 * 60 * 1000);
            labels = Array.from({length: 24}, (_, i) => i + '時');
            data = generateDailyData();
            break;
        case 'week':
            usage = calculateUsage(7 * 24 * 60 * 60 * 1000);
            labels = ['月', '火', '水', '木', '金', '土', '日'];
            data = generateWeeklyData();
            break;
        case 'month':
            usage = calculateUsage(30 * 24 * 60 * 60 * 1000);
            labels = Array.from({length: 30}, (_, i) => i + 1 + '日');
            data = generateMonthlyData();
            break;
    }

    document.getElementById('usage-amount').textContent = usage.toFixed(2);
    
    // 比較データの生成（前回のデータがないため、現在のデータの90%とします）
    const comparisonData = data.map(value => value * 0.9);
    const comparisonUsage = comparisonData.reduce((a, b) => a + b, 0);
    const difference = usage - comparisonUsage;
    const percentChange = ((difference / comparisonUsage) * 100).toFixed(2);
    
    const comparisonElement = document.getElementById('usage-comparison');
    comparisonElement.innerHTML = `
        前${currentUsage === 'day' ? '日' : currentUsage === 'week' ? '週' : '月'}: ${comparisonUsage.toFixed(2)}円 (${percentChange}%)
    `;

    document.getElementById('previous-month-date').textContent = new Date(Date.now() - (currentPeriodIndex + 1) * 
        (currentUsage === 'day' ? 24 * 60 * 60 * 1000 : 
         currentUsage === 'week' ? 7 * 24 * 60 * 60 * 1000 : 
         30 * 24 * 60 * 60 * 1000)).toLocaleDateString();

    updateChart(labels, data, comparisonData);
    updateGoalProgress(usage);
}

function generateDailyData() {
    const hourlyData = Array(24).fill(0);
    const now = new Date();
    const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    
    for (let data of plugData) {
        if (data.timestamp >= dayStart) {
            const hour = new Date(data.timestamp).getHours();
            hourlyData[hour] += data.power / 60000 * pricePerKWh / 1000;
        }
    }
    
    return hourlyData;
}

function generateWeeklyData() {
    const dailyData = Array(7).fill(0);
    const now = new Date();
    const weekStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() - now.getDay()).getTime();
    
    for (let data of plugData) {
        if (data.timestamp >= weekStart) {
            const day = Math.floor((data.timestamp - weekStart) / (24 * 60 * 60 * 1000));
            dailyData[day] += data.power / 60000 * pricePerKWh / 1000;
        }
    }
    
    return dailyData;
}

function generateMonthlyData() {
    const dailyData = Array(30).fill(0);
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    
    for (let data of plugData) {
        if (data.timestamp >= monthStart) {
            const day = Math.floor((data.timestamp - monthStart) / (24 * 60 * 60 * 1000));
            if (day < 30) {
                dailyData[day] += data.power / 60000 * pricePerKWh / 1000;
            }
        }
    }
    
    return dailyData;
}

function updateChart(labels, data, comparisonData) {
    if (usageChart) {
        usageChart.destroy();
    }

    const ctx = document.getElementById('usageChart').getContext('2d');
    usageChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: '現在の使用量',
                data: data,
                borderColor: '#3498db',
                backgroundColor: 'rgba(52, 152, 219, 0.1)',
                borderWidth: 2,
                fill: true
            }, {
                label: '前回の使用量',
                data: comparisonData,
                borderColor: '#e74c3c',
                backgroundColor: 'rgba(231, 76, 60, 0.1)',
                borderWidth: 2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: '電力使用量 (円)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: currentUsage === 'day' ? '時間' : (currentUsage === 'week' ? '曜日' : '日付')
                    }
                }
            },
            plugins: {
                tooltip: {
                    mode: 'index',
                    intersect: false,
                },
            },
            hover: {
                mode: 'nearest',
                intersect: true
            }
        }
    });
}

function addMonthlyGoal() {
    const lastMonth = new Date();
    lastMonth.setMonth(lastMonth.getMonth() - 1);
    const lastMonthUsage = generateMonthlyData().reduce((a, b) => a + b, 0);

    const goalAmount = prompt(`先月の使用量: ${lastMonthUsage.toFixed(2)}円\n今月の目標金額を入力してください:`);
    if (goalAmount && !isNaN(goalAmount)) {
        monthlyGoals.push({
            month: new Date().toLocaleString('default', { month: 'long' }),
            amount: parseFloat(goalAmount)
        });
        renderMonthlyGoals();
        updateGoalProgress();
    }
}

function renderMonthlyGoals() {
    const goalsContainer = document.getElementById('monthly-goals');
    goalsContainer.innerHTML = '';
    monthlyGoals.forEach((goal, index) => {
        const goalElement = document.createElement('div');
        goalElement.className = 'goal-item';
        goalElement.innerHTML = `
            <span>${goal.month}: ${goal.amount}円</span>
            <button onclick="deleteMonthlyGoal(${index})">削除</button>
        `;
        goalsContainer.appendChild(goalElement);
    });
}

function deleteMonthlyGoal(index) {
    monthlyGoals.splice(index, 1);
    renderMonthlyGoals();
    updateGoalProgress();
}

function updateGoalProgress(currentUsage) {
    const progressElement = document.getElementById('goal-progress');
    if (monthlyGoals.length === 0) {
        progressElement.innerHTML = '';
        return;
    }

    const currentGoal = monthlyGoals[monthlyGoals.length - 1];
    const progressPercentage = (currentUsage / currentGoal.amount) * 100;

    progressElement.innerHTML = `
        <h3>目標進捗状況</h3>
        <p>現在の使用量: ${currentUsage.toFixed(2)}円 (目標の${progressPercentage.toFixed(2)}%)</p>
        <progress value="${progressPercentage}" max="100"></progress>
    `;
}

function addDevice() {
    const outlet = outlets.find(o => o.id === currentTab);
    const newDevice = { name: "新しいデバイス", power: 0 };
    outlet.devices.push(newDevice);
    renderDevices(outlet);
    updatePowerUsage(outlet);
}

function renderDevices(outlet) {
    const container = document.getElementById('devices-container');
    container.innerHTML = '';
    outlet.devices.forEach((device, index) => {
        const deviceElement = document.createElement('div');
        deviceElement.className = 'device-item';
        deviceElement.innerHTML = `
            <span class="device-name">${device.name}</span>
            <span class="device-power">${device.power} W</span>
            <div class="device-risk" style="background-color: ${getRiskColor(device.power)}"></div>
            <button class="device-edit" onclick="openDeviceEditModal(${index})">編集</button>
        `;
        container.appendChild(deviceElement);
    });
}

function getRiskColor(power) {
    if (power < 500) return '#2ecc71';
    if (power < 1000) return '#f1c40f';
    return '#e74c3c';
}

function openDeviceEditModal(index) {
    currentEditingDevice = index;
    const outlet = outlets.find(o => o.id === currentTab);
    const device = outlet.devices[index];
    const modal = document.getElementById('deviceEditModal');
    document.getElementById('editDeviceName').value = device.name;
    document.getElementById('editDevicePower').value = device.power;
    modal.style.display = 'block';
}

function saveDeviceEdit() {
    const newName = document.getElementById('editDeviceName').value;
    const newPower = parseInt(document.getElementById('editDevicePower').value);
    const outlet = outlets.find(o => o.id === currentTab);
    if (currentEditingDevice !== null && newName && !isNaN(newPower)) {
        outlet.devices[currentEditingDevice] = { name: newName, power: newPower };
        renderDevices(outlet);
        updatePowerUsage(outlet);
    }
    closeModal();
}
function deleteDevice() {
    const outlet = outlets.find(o => o.id === currentTab);
    if (currentEditingDevice !== null) {
        outlet.devices.splice(currentEditingDevice, 1);
        renderDevices(outlet);
        updatePowerUsage(outlet);
    }
    closeModal();
}

function closeModal() {
    const modal = document.getElementById('deviceEditModal');
    modal.style.display = 'none';
    currentEditingDevice = null;
}

function toggleOutlet() {
    const outlet = outlets.find(o => o.id === currentTab);
    outlet.isOn = !outlet.isOn;
    updateOutletStatus(outlet);
}

function updateOutletStatus(outlet) {
    const statusElement = document.getElementById('outlet-status');
    statusElement.textContent = outlet.isOn ? 'オン' : 'オフ';
    statusElement.style.color = outlet.isOn ? '#2ecc71' : '#e74c3c';
    
    // オンの場合はデータ取得を開始し、オフの場合は停止する
    if (outlet.isOn) {
        startDataCollection();
    } else {
        stopDataCollection();
    }
}

let dataCollectionInterval;

function startDataCollection() {
    if (!dataCollectionInterval) {
        dataCollectionInterval = setInterval(fetchAndStoreData, dataInterval);
    }
}

function stopDataCollection() {
    if (dataCollectionInterval) {
        clearInterval(dataCollectionInterval);
        dataCollectionInterval = null;
    }
}

// ページ読み込み時の初期化
window.onload = function() {
    initializeOutlets();
    renderMonthlyGoals();
    startDataCollection();
};

// ウィンドウが閉じられる時にデータ収集を停止
window.onbeforeunload = function() {
    stopDataCollection();
};