<?php

function timer($intervalo, $contadorReinicio): void
{
    $Object = new DateTime();
    $hora = $Object->format("H");

    $r = shell_exec("node --no-warnings " . getcwd() . "/eInforma_local.js");
    echo $r . PHP_EOL;
    sleep(mt_rand(15, 40));

    timer($intervalo, 0);
    // if (strval($hora) >= 7 && strval($hora) <= 21)
    //     timer($intervalo, 0);
}

timer(15, 0);
