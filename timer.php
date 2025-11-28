<?php

function timer($intervalo, $contadorReinicio): void
{
    $Object = new DateTime();
    $hora = $Object->format("H");

    // if ($contadorReinicio == 50) {
    //     exec("/usr/bin/reiniciarCaptura");
    //     $contadorReinicio = 0;
    //     sleep(60);
    // }

    $r = shell_exec("node --no-warnings " . getcwd() . "/eInforma.js");
    echo $r . PHP_EOL;
    sleep(mt_rand(10, 20));

    if (strval($hora) >= 7 && strval($hora) <= 21)
        timer($intervalo, 0);
}

timer(15, 0);
