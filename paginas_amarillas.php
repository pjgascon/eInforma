<?php
require_once('vendor/conexion.php');

function realizarBusqueda()
{
    $con = new Conexion();
    $con->conectar();
    $query = "call captura.paginas_amarillas_seleccionar();";

    $r = $con->query($query);
    $resultados = $r->num_rows > 0 ? $r->fetch_all(MYSQLI_ASSOC) : null;

    if (!is_null($resultados)) {
        foreach ($resultados as $item) {
            $id = $item["id"];
            $nombre = explode("/",$item["nombre"])[0];
            $poblacion = $item["localidad"];

            $pg = shell_exec("node --no-warnings " . getcwd() . "/telefono.js '{$nombre}' '{$poblacion}'");

            $pg = json_decode($pg, true);

            if ($pg["ok"]) {
                $con->next_result();
                $con->query("call captura.paginas_amarillas_actualizar_telefono({$id},'{$pg['data']['telefono']}');");
                echo "Actualizando {$nombre} - {$pg['data']['telefono']}" . PHP_EOL;
            }
        }
        sleep(random_int(1, 15));
        realizarBusqueda();
    }
}

realizarBusqueda();
