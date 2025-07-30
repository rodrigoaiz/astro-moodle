<?php
// Configuración de Moodle detrás de Nginx proxy
global $CFG;

// URL raíz FORZADA
$CFG->wwwroot = 'http://132.248.218.76:4324/learning';

// Configuración de proxy inverso
$CFG->reverseproxy = true;
$CFG->sslproxy = false;

// Red de confianza
$CFG->trusted_proxies = '172.18.0.0/16';

// IMPORTANTE: Sobrescribir detección automática del host
$CFG->httpswwwroot = $CFG->wwwroot;

// Manipular las variables del servidor para consistencia
$_SERVER['HTTP_HOST'] = '132.248.218.76:4324';
$_SERVER['SERVER_NAME'] = '132.248.218.76';
$_SERVER['SERVER_PORT'] = '4324';

// Configuración de debugging para desarrollo
$CFG->debug = 0;
$CFG->debugdisplay = 0;

// SOLUCION DEFINITIVA: Reescribir URLs en la salida HTML
function fix_moodle_urls($buffer) {
    // Patterns para encontrar URLs que necesitan /learning
    $patterns = array(
        // href links
        '/href="http:\/\/132\.248\.218\.76:4324\/(?!learning)([^"]*)"/',
        // src attributes
        '/src="http:\/\/132\.248\.218\.76:4324\/(?!learning)([^"]*)"/',
        // action attributes
        '/action="http:\/\/132\.248\.218\.76:4324\/(?!learning)([^"]*)"/',
        // JavaScript wwwroot
        '/"wwwroot":"http:\\\/\\\/132\.248\.218\.76:4324(?!\\\/learning)"/',
        // JavaScript other URLs
        '/"homeurl":\{\}/',
    );

    $replacements = array(
        'href="http://132.248.218.76:4324/learning/$1"',
        'src="http://132.248.218.76:4324/learning/$1"',
        'action="http://132.248.218.76:4324/learning/$1"',
        '"wwwroot":"http:\/\/132.248.218.76:4324\/learning"',
        '"homeurl":{"learning":"http:\/\/132.248.218.76:4324\/learning"}',
    );

    return preg_replace($patterns, $replacements, $buffer);
}

// Iniciar output buffering al principio
if (!headers_sent()) {
    ob_start('fix_moodle_urls');
}
