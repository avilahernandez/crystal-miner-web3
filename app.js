/**
 * Configuración del Contrato Inteligente
 * Dirección del contrato (reemplazar por la dirección real desplegada en Sepolia).
 */
const CONTRACT_ADDRESS = "0x0000000000000000000000000000000000000000"; 

/**
 * Interfaz Binaria de la Aplicación (ABI)
 * Define las funciones del contrato que este frontend puede leer y ejecutar.
 */
const CONTRACT_ABI = [
    "function claim(uint256 amount) external",
    "function balanceOf(address account) external view returns (uint256)",
    "function cooldownRemaining(address player) external view returns (uint256)"
];

/**
 * Configuración de Niveles del Juego
 * Define el nombre y los puntos requeridos para avanzar de nivel.
 */
const LEVELS = [
    {name: 'BRONCE', req: 100}, 
    {name: 'PLATA', req: 500}, 
    {name: 'ORO', req: 2000}
];

/**
 * Variables de Estado Global
 * gemPoints se inicializa leyendo la memoria del navegador (localStorage).
 * Las demás variables almacenan las referencias a las librerías de Web3.
 */
let gemPoints = parseInt(localStorage.getItem('gemPoints')) || 0;
let provider, signer, contract, userAddress;

/**
 * Referencias al DOM
 * Se agrupan en un objeto para facilitar el acceso y evitar consultas repetitivas al documento.
 */
const ui = {
    points: document.getElementById('gemPoints'),
    balance: document.getElementById('questBalance'),
    level: document.getElementById('level'),
    progress: document.getElementById('progress'),
    refineBtn: document.getElementById('refineBtn'),
    connectBtn: document.getElementById('connectBtn'),
    crystalBtn: document.getElementById('crystalBtn')
};

/**
 * Actualización de la Interfaz de Usuario (UI)
 * Se encarga de reflejar el estado actual del juego en la pantalla.
 */
function updateUI() {
    // Actualiza el contador de puntos formateado con comas (ej. 1,000)
    ui.points.innerText = gemPoints.toLocaleString();
    
    // Lógica para determinar el nivel actual basado en los puntos acumulados
    let currentLevel = LEVELS[0];
    for(let l of LEVELS) { if(gemPoints >= l.req) currentLevel = l; }
    ui.level.innerText = currentLevel.name;
    
    // Control del botón Refinar: Se habilita si hay puntos suficientes (>= 100)
    if (gemPoints >= 100) {
        ui.refineBtn.disabled = false;
        ui.refineBtn.innerText = "[ REFINAR (+10 $QUEST) ]";
        ui.progress.innerText = "LISTO PARA REFINAR";
    } else {
        ui.refineBtn.disabled = true;
        ui.refineBtn.innerText = "[ REFINAR ]";
        ui.progress.innerText = `${gemPoints} / 100`;
    }
}

/**
 * Evento: Clic en el Cristal
 * Incrementa los puntos locales, guarda en localStorage y actualiza la UI.
 */
ui.crystalBtn.addEventListener('click', () => {
    gemPoints++;
    localStorage.setItem('gemPoints', gemPoints);
    updateUI();
});

/**
 * Evento: Conexión de Wallet Web3
 * Utiliza la API de Ethers.js para solicitar acceso a la billetera inyectada (ej. Phantom/MetaMask).
 */
ui.connectBtn.addEventListener('click', async () => {
    if (typeof window.ethereum !== 'undefined') {
        try {
            // Inicializa el proveedor y solicita permisos de conexión
            provider = new ethers.BrowserProvider(window.ethereum);
            await provider.send("eth_requestAccounts", []);
            
            // Obtiene el firmante y la dirección de la cuenta conectada
            signer = await provider.getSigner();
            userAddress = await signer.getAddress();
            
            // Actualiza el botón para mostrar una versión abreviada de la dirección (ej. 0x12..34)
            ui.connectBtn.innerText = `${userAddress.slice(0,4)}..${userAddress.slice(-4)}`;
            
            // Instancia el contrato para futuras interacciones (lectura de saldo, etc.)
            contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
            
            // Consulta el balance del token $QUEST del usuario en la blockchain
            const bal = await contract.balanceOf(userAddress);
            ui.balance.innerText = ethers.formatEther(bal);
        } catch (e) {
            alert("Error al conectar: " + e.message);
        }
    } else {
        // Mensaje de error si no se detecta ninguna billetera en el navegador
        alert("Instala Phantom o MetaMask");
    }
});

/**
 * Evento: Clic en el botón Refinar
 * Ejecuta una transacción (Llamada de escritura) al contrato inteligente.
 */
ui.refineBtn.addEventListener('click', async () => {
    // Validación de seguridad: No se puede ejecutar si no hay una wallet conectada.
    if(!contract) return alert("Conecta tu wallet primero");
    
    try {
        ui.refineBtn.innerText = "[ CONFIRMANDO... ]";
        
        // Envía la transacción al contrato (parseEther convierte "10" a 10^18 wei)
        const tx = await contract.claim(ethers.parseEther("10"));
        
        // Espera a que la transacción sea minada y confirmada en la red
        await tx.wait();
        
        alert("¡Recompensa reclamada!");
        
        // Resetea los puntos locales después de una transacción exitosa
        gemPoints = 0;
        localStorage.setItem('gemPoints', 0);
        updateUI();
        
        // Vuelve a consultar el saldo actualizado en la blockchain
        const bal = await contract.balanceOf(userAddress);
        ui.balance.innerText = ethers.formatEther(bal);
    } catch (e) {
        // Manejo de errores comunes (ej. cooldown del contrato o red incorrecta)
        alert("Error: Revisa cooldown o red Sepolia");
        ui.refineBtn.innerText = "[ REFINAR ]";
    }
});

// Inicialización de la interfaz al cargar la página por primera vez
updateUI();
