<?php
// Configuración de Moodle detrás de Nginx proxy
global $CFG;

// FORZAR las variables del servidor ANTES de que Moodle las use
$_SERVER['HTTP_HOST'] = '132.248.218.76:4324';
$_SERVER['REQUEST_URI'] = '/learning' . ($_SERVER['REQUEST_URI'] ?? '/');
$_SERVER['SCRIPT_NAME'] = '/learning' . ($_SERVER['SCRIPT_NAME'] ?? '');

// URL raíz FORZADA
$CFG->wwwroot = 'http://132.248.218.76:4324/learning';

// Configuración de proxy inverso
$CFG->reverseproxy = true;
$CFG->sslproxy = false;

// Red de confianza
$CFG->trusted_proxies = '172.18.0.0/16';

// IMPORTANTE: Sobrescribir detección automática del host
$CFG->httpswwwroot = $CFG->wwwroot;

// Configuración de debugging para desarrollo
$CFG->debug = 0;
$CFG->debugdisplay = 0;
