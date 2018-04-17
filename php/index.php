<?php

// RSS Proxy

$rss = file_get_contents($_GET['url']);

// MIME
$finfo = finfo_open(FILEINFO_MIME);
$mime = finfo_buffer($finfo, $rss);
finfo_close($finfo);

header('Access-Control-Allow-Origin:https://priceless-mcclintock-62cfae.netlify.com');
// header('Access-Control-Allow-Origin:http://localhost:3000');
header('Content-Type:'.$mime);
echo $rss;
