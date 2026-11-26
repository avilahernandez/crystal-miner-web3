const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; 
const CONTRACT_ABI = [
    "function claim(uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function cooldownRemaining(address player) external view returns (uint256)"
];
const LEVELS = [{name: 'BRONCE', req: 100}, {name: 'PLATA', req: 500}, {name: 'ORO', req: 2000}];

let gemPoints = parseInt(localStorage.getItem('gemPoints')) || 0;
let provider, signer, contract, userAddress;

const ui = {
    points: document.getElementById('gemPoints'),
    balance: document.getElementById('questBalance'),
    level: document.getElementById('level'),
    progress: document.getElementById('progress'),
    refineBtn: document.getElementById('refineBtn'),
    connectBtn: document.getElementById('connectBtn'),
    crystalBtn: document.getElementById('crystalBtn'),
    resetBtn: document.getElementById('resetBtn'),
    statusPanel: document.querySelector('.status-panel')
};

function updateUI() {
    ui.points.innerText = gemPoints.toLocaleString();
    let currentLevel = LEVELS[0];
    for(let l of LEVELS) { if(gemPoints >= l.req) currentLevel = l; }
    ui.level.innerText = currentLevel.name;
    
    if (gemPoints >= 100) {
        ui.refineBtn.disabled = false;
        ui.refineBtn.innerText = "[ REFINAR (+10 $QUEST) ]";
        if(!ui.progress.innerText.includes("ERR")) {
            ui.progress.innerText = "LISTO PARA REFINAR";
        }
    } else {
        ui.refineBtn.disabled = true;
        ui.refineBtn.innerText = "[ REFINAR ]";
        ui.progress.innerText = `${gemPoints} / 100`;
    }
}

ui.crystalBtn.addEventListener('click', () => {
    gemPoints++;
    localStorage.setItem('gemPoints', gemPoints);
    updateUI();
});

// Lógica del botón de reinicio para pruebas
ui.resetBtn.addEventListener('click', () => {
    gemPoints = 0;
    localStorage.setItem('gemPoints', 0);
    
    // Restaurar colores normales del panel
    ui.statusPanel.style.borderColor = "#00ffff";
    ui.statusPanel.style.boxShadow = "0 0 10px rgba(0,255,255,0.3) inset, 0 0 10px rgba(0,255,255,0.3)";
    
    updateUI();
});

ui.connectBtn.addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
            ui.connectBtn.innerText = `${userAddress.slice(0,4)}..${userAddress.slice(-4)}`;
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            try {
                const bal = await contract.balanceOf(userAddress);
                ui.balance.innerText = ethers.formatEther(bal);
            } catch (readError) {
                console.warn("Contrato no detectado en Sepolia.");
                ui.balance.innerText = "0.00";
                ui.progress.innerText = "ERR: CONTRATO PENDIENTE";
                ui.statusPanel.style.borderColor = "#ff00ff";
                ui.statusPanel.style.boxShadow = "0 0 10px rgba(255,0,255,0.5) inset, 0 0 10px rgba(255,0,255,0.5)";
            }
            
        } catch (e) {
            alert("Error de conexión: " + e.message);
        }
    } else {
        alert("Instala Phantom o MetaMask");
    }
});

ui.refineBtn.addEventListener('click', async () => {
    if(!contract) return alert("Conecta tu wallet primero");
    try {
        ui.refineBtn.innerText = "[ CONFIRMANDO... ]";
        const tx = await contract.claim(ethers.parseEther("10"));
        await tx.wait();
        alert("¡Recompensa reclamada!");
        gemPoints = 0;
        localStorage.setItem('gemPoints', 0);
        updateUI();
        const bal = await contract.balanceOf(userAddress);
        ui.balance.innerText = ethers.formatEther(bal);
    } catch (e) {
        console.error(e);
        ui.refineBtn.innerText = "[ REFINAR ]";
        ui.progress.innerText = "ERR: SIN SMART CONTRACT";
        ui.statusPanel.style.borderColor = "#ff0000";
        ui.statusPanel.style.boxShadow = "0 0 10px rgba(255,0,0,0.5) inset, 0 0 10px rgba(255,0,0,0.5)";
    }
});

updateUI();
