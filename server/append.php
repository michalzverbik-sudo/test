<?php
// server/append.php — appends a row to bol_timer_log.csv (UTF-8)
// Simple token check; change the token below and also in index.html (SERVER_TOKEN).
$TOKEN = 'CHANGE_ME_SECRET';

header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok'=>false,'err'=>'Method not allowed']);
  exit;
}

$input = file_get_contents('php://input');
$data = json_decode($input, true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['ok'=>false,'err'=>'Bad JSON']);
  exit;
}

// Token check
if (!isset($data['token']) || $data['token'] !== $TOKEN) {
  http_response_code(401);
  echo json_encode(['ok'=>false,'err'=>'Unauthorized']);
  exit;
}

// Extract fields
function esc_csv($s) { return '"' . str_replace('"','""', (string)$s) . '"'; }

$code = $data['code'] ?? '';
$name = $data['name'] ?? '';
$startISO = $data['startISO'] ?? '';
$endISO   = $data['endISO'] ?? '';
$cleanMs = intval($data['cleanMs'] ?? 0);
$pauses = intval($data['pauses'] ?? 0);
$leftover = intval($data['leftoverCartons'] ?? 0);

// Format times for SK locale-friendly CSV
$start = $startISO ? date('d.m.Y H:i:s', strtotime($startISO)) : '';
$end   = $endISO   ? date('d.m.Y H:i:s', strtotime($endISO)) : '';

// Convert ms -> HH:MM:SS
$sec = floor($cleanMs/1000);
$h = floor($sec/3600);
$m = floor(($sec%3600)/60);
$s = $sec%60;
$cleanHMS = sprintf('%02d:%02d:%02d', $h,$m,$s);

// Ensure file exists with header
$csvPath = __DIR__ . '/bol_timer_log.csv';
if (!file_exists($csvPath)) {
  $fh = fopen($csvPath, 'w');
  // UTF-8 BOM for Excel compatibility (optional)
  fwrite($fh, "\xEF\xBB\xBF");
  fwrite($fh, "BOL,Meno,Štart,Koniec,Čistý čas,Pauzy,Zostalo (kartóny)\n");
  fclose($fh);
}

// Append row
$fh = fopen($csvPath, 'a');
$line = implode(',', [
  esc_csv($code),
  esc_csv($name),
  esc_csv($start),
  esc_csv($end),
  esc_csv($cleanHMS),
  esc_csv($pauses),
  esc_csv($leftover),
]) . "\n";
fwrite($fh, $line);
fclose($fh);

echo json_encode(['ok'=>true]);
