<?php
// api/clear.php — clear all rows (keep header)
$FILE = __DIR__ . '/../bol_data.csv';
if ($_SERVER['REQUEST_METHOD'] !== 'POST') { http_response_code(405); exit; }
$header = ['id','code','name','startISO','endISO','startHuman','endHuman','cleanMs','cleanHMS','pauses','leftoverCartons'];
$fh = fopen($FILE, 'w');
if (!$fh) { http_response_code(500); echo 'Cannot open file'; exit; }
fputcsv($fh, $header);
fclose($fh);
header('Content-Type: application/json');
echo json_encode(['ok'=>true]);
