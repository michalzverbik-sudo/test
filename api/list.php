<?php
// api/list.php — read CSV and return JSON for frontend
$FILE = __DIR__ . '/../bol_data.csv';
header('Content-Type: application/json; charset=utf-8');

if (!file_exists($FILE)) { echo json_encode(['rows'=>[]]); exit; }

$rows = [];
if (($fh = fopen($FILE, 'r')) !== false) {
  $header = fgetcsv($fh);
  while (($r = fgetcsv($fh)) !== false) {
    $row = array_combine($header, $r);
    // Ensure correct types
    $row['cleanMs'] = intval($row['cleanMs']);
    $row['pauses'] = intval($row['pauses']);
    $row['leftoverCartons'] = intval($row['leftoverCartons']);
    $rows[] = $row;
  }
  fclose($fh);
}
echo json_encode(['rows'=>$rows]);
