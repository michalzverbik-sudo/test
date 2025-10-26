<?php
// api/save.php — append to CSV "Excel-friendly" database
// File path (writable by webserver user)
$FILE = __DIR__ . '/../bol_data.csv';

// Ensure JSON body
$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!$data) { http_response_code(400); echo json_encode(['error'=>'Invalid JSON']); exit; }

// Prepare row fields
$id = $data['id'] ?? '';
$code = $data['code'] ?? '';
$name = $data['name'] ?? '';
$startISO = $data['startISO'] ?? '';
$endISO = $data['endISO'] ?? '';
$cleanMs = intval($data['cleanMs'] ?? 0);
$pauses = intval($data['pauses'] ?? 0);
$leftover = intval($data['leftoverCartons'] ?? 0);

// Human readable datetime (Europe/Bratislava)
date_default_timezone_set('Europe/Bratislava');
$startHuman = '';
$endHuman = '';
if ($startISO) { $ts = strtotime($startISO); $startHuman = date('d.m.Y H:i:s', $ts); }
if ($endISO)   { $te = strtotime($endISO);   $endHuman   = date('d.m.Y H:i:s', $te); }

function fmtHMS($ms){
  $s = intval($ms/1000);
  $h = floor($s/3600); $m = floor(($s%3600)/60); $sec = $s%60;
  return sprintf('%02d:%02d:%02d', $h, $m, $sec);
}
$cleanHMS = fmtHMS($cleanMs);

// Create file with header if not exists
if (!file_exists($FILE)) {
  $fh = fopen($FILE, 'w');
  fputcsv($fh, ['id','code','name','startISO','endISO','startHuman','endHuman','cleanMs','cleanHMS','pauses','leftoverCartons']);
  fclose($fh);
}

// Append row with file lock
$fh = fopen($FILE, 'a');
if (!$fh) { http_response_code(500); echo json_encode(['error'=>'Cannot open file']); exit; }
if (flock($fh, LOCK_EX)) {
  fputcsv($fh, [$id,$code,$name,$startISO,$endISO,$startHuman,$endHuman,$cleanMs,$cleanHMS,$pauses,$leftover]);
  fflush($fh);
  flock($fh, LOCK_UN);
  fclose($fh);
  header('Content-Type: application/json');
  echo json_encode(['ok'=>true]);
} else {
  fclose($fh);
  http_response_code(500);
  echo json_encode(['error'=>'Lock failed']);
}
