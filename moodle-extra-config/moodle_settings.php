<?php
// Moodle detrás de Nginx proxy
$CFG->wwwroot = 'http://132.248.218.76:4324/learning';

// Habilitar modo proxy inverso
$CFG->reverseproxy = true;
$CFG->sslproxy = false;

// Confía en los encabezados X-Forwarded
$CFG->trusted_proxies = '172.18.0.0/16';  // Red interna de Docker

// Puerto y host desde el proxy
$_SERVER['HTTP_HOST'] = '132.248.218.76:4324';
$_SERVER['SERVER_PORT'] = '4324';
$_SERVER['REQUEST_SCHEME'] = 'http';

// Opcional: evitar redirecciones a puertos internos
$CFG->preferred_url = $CFG->wwwroot;

// Asegura que las URLs generadas usen el puerto correcto
$CFG->generallib_extra_javascript = '';
